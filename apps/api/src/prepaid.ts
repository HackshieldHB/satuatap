import { prisma, type Prisma } from "@satu-atap/db";
import { priceUsageIdr } from "@satu-atap/shared";
import { createCommand } from "./automation.js";
import { hub } from "./events.js";
import { notify } from "./notify.js";

// Round IDR to 2 decimals to keep the Decimal column and JS math in agreement.
function idr(n: number): number {
  return Math.round(n * 100) / 100;
}

type Account = Prisma.PrepaidAccountGetPayload<object>;

function publish(homeId: string, event: string, data: Record<string, unknown>) {
  hub.publish({ event, homeId, data, ts: new Date().toISOString() });
}

async function cutDevice(homeId: string, deviceId: string | null, turnOn: boolean) {
  if (!deviceId) return;
  const device = await prisma.device.findFirst({ where: { id: deviceId, homeId } });
  if (!device) return;
  await createCommand({
    homeId,
    deviceId,
    type: turnOn ? "TURN_ON" : "TURN_OFF",
    params: {},
    idempotencyKey: `prepaid:${turnOn ? "on" : "off"}:${deviceId}:${Date.now()}`,
  });
}

/** Disconnect the configured relay/valve devices and flag the account. */
export async function disconnectPrepaid(account: Account): Promise<void> {
  await cutDevice(account.homeId, account.electricityRelayDeviceId, false);
  await cutDevice(account.homeId, account.waterValveDeviceId, false);
  await prisma.prepaidAccount.update({
    where: { homeId: account.homeId },
    data: { disconnected: true },
  });
  publish(account.homeId, "prepaid.disconnected", { homeId: account.homeId });
  await notify(account.homeId, {
    title: "Utilitas terputus",
    body: "Saldo prabayar habis. Listrik & air dinonaktifkan otomatis. Silakan isi ulang untuk menyambung kembali.",
    tag: "prepaid.disconnected",
  });
}

/** Restore power/water once the balance is positive again. */
export async function reconnectPrepaid(account: Account): Promise<void> {
  await cutDevice(account.homeId, account.electricityRelayDeviceId, true);
  await cutDevice(account.homeId, account.waterValveDeviceId, true);
  await prisma.prepaidAccount.update({
    where: { homeId: account.homeId },
    data: { disconnected: false },
  });
  publish(account.homeId, "prepaid.reconnected", { homeId: account.homeId });
  await notify(account.homeId, {
    title: "Utilitas tersambung kembali",
    body: "Terima kasih. Listrik & air aktif lagi.",
    tag: "prepaid.reconnected",
  });
}

/**
 * Price the metered deltas of one telemetry reading and debit the prepaid
 * balance. Called from the ingest path with enriched metrics (…_delta keys).
 * No-op unless the unit opted into prepaid. Triggers auto-disconnect at zero
 * and a low-balance warning below the threshold.
 */
export async function applyPrepaidUsage(
  homeId: string,
  metrics: Record<string, unknown>
): Promise<void> {
  const account = await prisma.prepaidAccount.findUnique({ where: { homeId } });
  if (!account || !account.enabled) return;

  const energyKwh = Number(metrics.energy_kwh_delta ?? 0);
  const waterLiters = Number(metrics.volume_liters_delta ?? 0);
  if (energyKwh <= 0 && waterLiters <= 0) return;

  const tariff = await prisma.utilityConfig.findUnique({ where: { homeId } });
  const cost = priceUsageIdr({
    energyKwh,
    waterLiters,
    electricityTariffPerKwh: Number(tariff?.electricityTariffPerKwh ?? 0),
    waterTariffPerM3: Number(tariff?.waterTariffPerM3 ?? 0),
  });
  if (cost <= 0) return;

  const before = Number(account.balanceIdr);
  const after = idr(before - cost);
  const updated = await prisma.prepaidAccount.update({
    where: { homeId },
    data: { balanceIdr: after },
  });
  await prisma.prepaidTransaction.create({
    data: {
      homeId,
      kind: "usage",
      amountIdr: idr(-cost),
      balanceAfterIdr: after,
      description: "Pemakaian listrik & air",
      meta: { energyKwh, waterLiters } as Prisma.InputJsonValue,
    },
  });
  publish(homeId, "prepaid.updated", { homeId, balanceIdr: after });

  if (after <= 0 && !updated.disconnected) {
    await disconnectPrepaid(updated);
    return;
  }
  if (
    after > 0 &&
    after <= account.lowBalanceThresholdIdr &&
    (!account.lowNotifiedAt || before > account.lowBalanceThresholdIdr)
  ) {
    await prisma.prepaidAccount.update({
      where: { homeId },
      data: { lowNotifiedAt: new Date() },
    });
    publish(homeId, "prepaid.low", { homeId, balanceIdr: after });
    await notify(homeId, {
      title: "Saldo prabayar menipis",
      body: `Sisa saldo Rp${Math.round(after).toLocaleString("id-ID")}. Segera isi ulang agar listrik & air tidak terputus.`,
      tag: "prepaid.low",
    });
  }
}

/** Credit the wallet and reconnect if it was cut. Returns the fresh account. */
export async function topupPrepaid(
  homeId: string,
  amountIdr: number,
  meta?: Record<string, unknown>
): Promise<Account> {
  const account = await prisma.prepaidAccount.findUnique({ where: { homeId } });
  if (!account) throw Object.assign(new Error("Prepaid not enabled"), { statusCode: 400 });

  const after = idr(Number(account.balanceIdr) + amountIdr);
  const updated = await prisma.prepaidAccount.update({
    where: { homeId },
    data: { balanceIdr: after, lowNotifiedAt: null },
  });
  await prisma.prepaidTransaction.create({
    data: {
      homeId,
      kind: "topup",
      amountIdr: idr(amountIdr),
      balanceAfterIdr: after,
      description: "Isi ulang saldo",
      meta: (meta as Prisma.InputJsonValue) ?? undefined,
    },
  });
  publish(homeId, "prepaid.updated", { homeId, balanceIdr: after });

  if (updated.disconnected && after > 0) {
    await reconnectPrepaid(updated);
  }
  return prisma.prepaidAccount.findUniqueOrThrow({ where: { homeId } });
}

export async function getPrepaidStatus(homeId: string) {
  const account = await prisma.prepaidAccount.findUnique({ where: { homeId } });
  if (!account) return null;
  const transactions = await prisma.prepaidTransaction.findMany({
    where: { homeId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return {
    homeId,
    enabled: account.enabled,
    balanceIdr: Number(account.balanceIdr),
    lowBalanceThresholdIdr: account.lowBalanceThresholdIdr,
    disconnected: account.disconnected,
    electricityRelayDeviceId: account.electricityRelayDeviceId,
    waterValveDeviceId: account.waterValveDeviceId,
    transactions: transactions.map((t) => ({
      id: t.id,
      kind: t.kind,
      amountIdr: Number(t.amountIdr),
      balanceAfterIdr: Number(t.balanceAfterIdr),
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

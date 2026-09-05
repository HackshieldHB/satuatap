import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { applyPrepaidUsage, topupPrepaid, getPrepaidStatus } from "./prepaid.js";

// Exercises the opt-in prepaid wallet against the real DB: usage debits the
// balance, hitting zero auto-cuts the configured relay via a real Command, and
// a top-up reconnects it. Scoped to home-1 (seeded) with a throwaway relay.
const RELAY = "test-prepaid-relay";
const IDEMP_PREFIX = "prepaid:off:test-prepaid-relay";

describe("prepaid wallet", () => {
  beforeAll(async () => {
    await prisma.command.deleteMany({ where: { deviceId: RELAY } });
    await prisma.device.deleteMany({ where: { id: RELAY } });
    await prisma.device.create({
      data: {
        id: RELAY,
        homeId: "home-1",
        roomId: "room-1",
        type: "switch",
        name: "Prepaid Test Relay",
        protocol: "mqtt",
        status: "online",
        capabilities: { create: [{ capability: "on_off" }] },
      },
    });
    await prisma.prepaidTransaction.deleteMany({ where: { homeId: "home-1" } });
    await prisma.prepaidAccount.upsert({
      where: { homeId: "home-1" },
      update: {
        enabled: true,
        balanceIdr: 5000,
        disconnected: false,
        electricityRelayDeviceId: RELAY,
        waterValveDeviceId: null,
        lowBalanceThresholdIdr: 3000,
        lowNotifiedAt: null,
      },
      create: {
        homeId: "home-1",
        enabled: true,
        balanceIdr: 5000,
        electricityRelayDeviceId: RELAY,
        lowBalanceThresholdIdr: 3000,
      },
    });
    // home-1 has a seeded UtilityConfig; make the tariff deterministic here.
    await prisma.utilityConfig.update({
      where: { homeId: "home-1" },
      data: { electricityTariffPerKwh: 1000, waterTariffPerM3: 0 },
    });
  });

  afterAll(async () => {
    await prisma.command.deleteMany({ where: { deviceId: RELAY } });
    await prisma.deviceCapability.deleteMany({ where: { deviceId: RELAY } });
    await prisma.device.deleteMany({ where: { id: RELAY } });
    await prisma.prepaidTransaction.deleteMany({ where: { homeId: "home-1" } });
    // Reset home-1 to postpaid so the demo/seed state is not left prepaid-on.
    await prisma.prepaidAccount.update({
      where: { homeId: "home-1" },
      data: { enabled: false, balanceIdr: 0, disconnected: false, lowNotifiedAt: null },
    });
  });

  it("debits usage and auto-disconnects at zero balance", async () => {
    // 2 kWh × 1000 = 2000 → balance 5000 → 3000 (also crosses low threshold)
    await applyPrepaidUsage("home-1", { energy_kwh_delta: 2 });
    let status = await getPrepaidStatus("home-1");
    expect(status?.balanceIdr).toBeCloseTo(3000, 2);
    expect(status?.disconnected).toBe(false);

    // 4 kWh × 1000 = 4000 → 3000 → -1000 → disconnect
    await applyPrepaidUsage("home-1", { energy_kwh_delta: 4 });
    status = await getPrepaidStatus("home-1");
    expect(status!.balanceIdr).toBeLessThanOrEqual(0);
    expect(status?.disconnected).toBe(true);

    const offCmd = await prisma.command.findFirst({
      where: { deviceId: RELAY, type: "TURN_OFF", idempotencyKey: { startsWith: IDEMP_PREFIX } },
    });
    expect(offCmd).not.toBeNull();
  });

  it("reconnects on top-up", async () => {
    await topupPrepaid("home-1", 50000, { paymentChannel: "qris" });
    const status = await getPrepaidStatus("home-1");
    expect(status!.balanceIdr).toBeGreaterThan(0);
    expect(status?.disconnected).toBe(false);

    const onCmd = await prisma.command.findFirst({
      where: { deviceId: RELAY, type: "TURN_ON" },
    });
    expect(onCmd).not.toBeNull();
  });
});

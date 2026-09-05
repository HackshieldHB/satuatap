import { prisma, type Prisma } from "@satu-atap/db";
import { priceUsageIdr } from "@satu-atap/shared";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** First day (UTC) of the month containing `d`. */
export function monthStart(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function monthEnd(start: Date): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}

export function periodLabelOf(start: Date): string {
  return `${MONTHS_ID[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
}

/** Parse a "YYYY-MM" string to that month's UTC start, else current month. */
export function parsePeriod(period?: string): Date {
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
  }
  return monthStart();
}

async function sumHourlyDelta(homeId: string, metric: string, start: Date, end: Date): Promise<number> {
  const agg = await prisma.telemetryAggregate.aggregate({
    _sum: { sum: true },
    where: { homeId, period: "hour", metric, periodStart: { gte: start, lt: end } },
  });
  return agg._sum.sum ?? 0;
}

function invoiceInclude() {
  return { lines: { orderBy: { amountIdr: "desc" as const } } };
}

export function mapInvoice(inv: Prisma.InvoiceGetPayload<{ include: { lines: true } }>) {
  return {
    id: inv.id,
    homeId: inv.homeId,
    periodStart: inv.periodStart.toISOString(),
    periodLabel: inv.periodLabel,
    status: inv.status,
    totalIdr: inv.totalIdr,
    dueDate: inv.dueDate.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null,
    paymentChannel: inv.paymentChannel,
    createdAt: inv.createdAt.toISOString(),
    lines: inv.lines.map((l) => ({
      id: l.id,
      kind: l.kind,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      amountIdr: l.amountIdr,
    })),
  };
}

/**
 * Build (or rebuild, if still unpaid) one unit's invoice for a month. Metered
 * electricity + water are charged only for postpaid units — prepaid units pay
 * upfront, so they get an IPL-only bill. Paid invoices are never overwritten.
 */
export async function generateInvoiceForHome(homeId: string, periodStart: Date) {
  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (!home) throw Object.assign(new Error("Home not found"), { statusCode: 404 });

  const existing = await prisma.invoice.findUnique({
    where: { homeId_periodStart: { homeId, periodStart } },
    include: invoiceInclude(),
  });
  if (existing && existing.status === "paid") return mapInvoice(existing);

  const end = monthEnd(periodStart);
  const tariff = await prisma.utilityConfig.findUnique({ where: { homeId } });
  const prepaid = await prisma.prepaidAccount.findUnique({ where: { homeId } });
  const electricityRate = Number(tariff?.electricityTariffPerKwh ?? 0);
  const waterRate = Number(tariff?.waterTariffPerM3 ?? 0);
  const ipl = tariff?.serviceChargeIdr ?? 0;

  const lines: { kind: string; description: string; quantity: number; unit: string; amountIdr: number }[] = [];

  if (!prepaid?.enabled) {
    const kwh = await sumHourlyDelta(homeId, "energy_kwh_delta", periodStart, end);
    const liters = await sumHourlyDelta(homeId, "volume_liters_delta", periodStart, end);
    const m3 = liters / 1000;
    const elecAmount = Math.round(priceUsageIdr({ energyKwh: kwh, waterLiters: 0, electricityTariffPerKwh: electricityRate, waterTariffPerM3: 0 }));
    const waterAmount = Math.round(priceUsageIdr({ energyKwh: 0, waterLiters: liters, electricityTariffPerKwh: 0, waterTariffPerM3: waterRate }));
    if (kwh > 0 || elecAmount > 0) {
      lines.push({ kind: "electricity", description: "Listrik", quantity: Math.round(kwh * 100) / 100, unit: "kWh", amountIdr: elecAmount });
    }
    if (liters > 0 || waterAmount > 0) {
      lines.push({ kind: "water", description: "Air", quantity: Math.round(m3 * 1000) / 1000, unit: "m³", amountIdr: waterAmount });
    }
  }
  if (ipl > 0) {
    lines.push({ kind: "ipl", description: "IPL / Iuran Pengelolaan", quantity: 1, unit: "bln", amountIdr: ipl });
  }

  const total = lines.reduce((s, l) => s + l.amountIdr, 0);
  const dueDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 20));
  const label = periodLabelOf(periodStart);

  if (existing) {
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: existing.id } });
    const updated = await prisma.invoice.update({
      where: { id: existing.id },
      data: { totalIdr: total, dueDate, periodLabel: label, lines: { create: lines } },
      include: invoiceInclude(),
    });
    return mapInvoice(updated);
  }

  const created = await prisma.invoice.create({
    data: {
      homeId,
      periodStart,
      periodLabel: label,
      status: "unpaid",
      totalIdr: total,
      dueDate,
      lines: { create: lines },
    },
    include: invoiceInclude(),
  });
  return mapInvoice(created);
}

export async function payInvoice(invoiceId: string, paymentChannel: string) {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw Object.assign(new Error("Invoice not found"), { statusCode: 404 });
  if (inv.status === "paid") {
    const cur = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: invoiceInclude() });
    return mapInvoice(cur);
  }
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date(), paymentChannel },
    include: invoiceInclude(),
  });
  return mapInvoice(updated);
}

export async function listInvoices(homeId: string) {
  const rows = await prisma.invoice.findMany({
    where: { homeId },
    include: invoiceInclude(),
    orderBy: { periodStart: "desc" },
    take: 24,
  });
  return rows.map(mapInvoice);
}

/** A user manages a building if they hold ADMIN on any unit within it. */
export async function canManageBuilding(userId: string, buildingId: string): Promise<boolean> {
  const m = await prisma.membership.findFirst({
    where: { userId, role: "ADMIN", home: { buildingId } },
  });
  return !!m;
}

export async function listBuildingUnits(buildingId: string) {
  const homes = await prisma.home.findMany({
    where: { buildingId },
    include: {
      floor: true,
      prepaidAccount: true,
      invoices: { orderBy: { periodStart: "desc" }, take: 6, include: invoiceInclude() },
    },
    orderBy: { name: "asc" },
  });
  return homes.map((h) => {
    const unpaid = h.invoices.filter((i) => i.status !== "paid" && i.status !== "void");
    const arrears = unpaid.reduce((s, i) => s + i.totalIdr, 0);
    return {
      homeId: h.id,
      name: h.name,
      floorLabel: h.floor?.name ?? "",
      prepaid: h.prepaidAccount?.enabled ?? false,
      prepaidBalanceIdr: h.prepaidAccount ? Number(h.prepaidAccount.balanceIdr) : null,
      disconnected: h.prepaidAccount?.disconnected ?? false,
      arrearsIdr: arrears,
      unpaidCount: unpaid.length,
      invoices: h.invoices.map(mapInvoice),
    };
  });
}

export async function generateBuildingInvoices(buildingId: string, periodStart: Date) {
  const homes = await prisma.home.findMany({ where: { buildingId }, select: { id: true } });
  const results = [];
  for (const h of homes) {
    results.push(await generateInvoiceForHome(h.id, periodStart));
  }
  return results;
}

import { prisma } from "@satu-atap/db";
import { priceUsageIdr } from "@satu-atap/shared";
import { monthStart, monthEnd } from "./billing.js";

const DAY_MS = 24 * 3600_000;

async function sumHourlyDelta(homeId: string, metric: string, start: Date, end: Date): Promise<number> {
  const agg = await prisma.telemetryAggregate.aggregate({
    _sum: { sum: true },
    where: { homeId, period: "hour", metric, periodStart: { gte: start, lt: end } },
  });
  return agg._sum.sum ?? 0;
}

// Sum a delta metric restricted to given UTC hour range across a window.
async function sumInHours(homeId: string, metric: string, start: Date, end: Date, hourFrom: number, hourTo: number): Promise<number> {
  const rows = await prisma.telemetryAggregate.findMany({
    where: { homeId, period: "hour", metric, periodStart: { gte: start, lt: end } },
    select: { periodStart: true, sum: true },
  });
  return rows
    .filter((r) => {
      const h = r.periodStart.getUTCHours();
      return h >= hourFrom && h < hourTo;
    })
    .reduce((s, r) => s + r.sum, 0);
}

export type Insight = {
  id: string;
  kind: "forecast" | "trend" | "leak" | "standby" | "benchmark";
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  valueIdr?: number;
};

/** Predictive + anomaly insights for one unit, computed from telemetry aggregates. */
export async function getInsights(homeId: string): Promise<Insight[]> {
  const now = new Date();
  const mStart = monthStart(now);
  const mEnd = monthEnd(mStart);
  const tariff = await prisma.utilityConfig.findUnique({ where: { homeId } });
  const eRate = Number(tariff?.electricityTariffPerKwh ?? 0);
  const wRate = Number(tariff?.waterTariffPerM3 ?? 0);
  const ipl = tariff?.serviceChargeIdr ?? 0;

  const insights: Insight[] = [];

  // 1) Bill forecast — extrapolate month-to-date to month end.
  const kwhMtd = await sumHourlyDelta(homeId, "energy_kwh_delta", mStart, now);
  const litersMtd = await sumHourlyDelta(homeId, "volume_liters_delta", mStart, now);
  const elapsedDays = Math.max(0.5, (now.getTime() - mStart.getTime()) / DAY_MS);
  const daysInMonth = (mEnd.getTime() - mStart.getTime()) / DAY_MS;
  const factor = daysInMonth / elapsedDays;
  const projKwh = kwhMtd * factor;
  const projLiters = litersMtd * factor;
  const projUtil = priceUsageIdr({ energyKwh: projKwh, waterLiters: projLiters, electricityTariffPerKwh: eRate, waterTariffPerM3: wRate });
  const projTotal = Math.round(projUtil + ipl);
  if (kwhMtd > 0 || litersMtd > 0) {
    insights.push({
      id: "forecast",
      kind: "forecast",
      severity: "info",
      title: "Perkiraan tagihan bulan ini",
      body: `Berdasarkan pemakaian ${elapsedDays.toFixed(0)} hari pertama (${projKwh.toFixed(1)} kWh, ${(projLiters / 1000).toFixed(1)} m³), tagihan diperkirakan mendekati angka ini.`,
      valueIdr: projTotal,
    });
  }

  // 2) Trend vs last month (same elapsed-days window).
  const lastMStart = monthStart(new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() - 1, 1)));
  const lastWindowEnd = new Date(lastMStart.getTime() + elapsedDays * DAY_MS);
  const kwhLast = await sumHourlyDelta(homeId, "energy_kwh_delta", lastMStart, lastWindowEnd);
  if (kwhLast > 0) {
    const pct = Math.round(((kwhMtd - kwhLast) / kwhLast) * 100);
    insights.push({
      id: "trend",
      kind: "trend",
      severity: pct > 20 ? "warning" : "info",
      title: pct >= 0 ? `Listrik ${pct}% lebih tinggi` : `Listrik ${Math.abs(pct)}% lebih hemat`,
      body: `Dibanding ${elapsedDays.toFixed(0)} hari pertama bulan lalu (${kwhLast.toFixed(1)} kWh → ${kwhMtd.toFixed(1)} kWh).`,
    });
  }

  // 3) Possible leak — sustained overnight water flow (00–05 UTC) over 7 days.
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const nightLiters = await sumInHours(homeId, "volume_liters_delta", weekAgo, now, 0, 5);
  const nightPerDay = nightLiters / 7;
  if (nightPerDay > 40) {
    insights.push({
      id: "leak",
      kind: "leak",
      severity: "warning",
      title: "Potensi kebocoran air",
      body: `Rata-rata ${nightPerDay.toFixed(0)} L terpakai tiap dini hari (00–05) selama sepekan. Aliran malam yang konstan sering menandakan bocor tersembunyi.`,
    });
  }

  // 4) Standby load — non-zero electricity every night hour.
  const nightKwh = await sumInHours(homeId, "energy_kwh_delta", weekAgo, now, 1, 5);
  const standbyPerNight = nightKwh / 7;
  if (standbyPerNight > 1.5) {
    insights.push({
      id: "standby",
      kind: "standby",
      severity: "info",
      title: "Beban standby tinggi",
      body: `Sekitar ${standbyPerNight.toFixed(1)} kWh terpakai tiap malam saat aktivitas minim — cek perangkat yang menyala terus.`,
    });
  }

  return insights;
}

/** Rank a building's units by this month's electricity — most efficient first. */
export async function getLeaderboard(buildingId: string) {
  const homes = await prisma.home.findMany({ where: { buildingId }, select: { id: true, name: true } });
  const mStart = monthStart();
  const now = new Date();
  const rows = [];
  for (const h of homes) {
    const kwh = await sumHourlyDelta(h.id, "energy_kwh_delta", mStart, now);
    rows.push({ homeId: h.id, name: h.name, kwh: Math.round(kwh * 100) / 100 });
  }
  rows.sort((a, b) => a.kwh - b.kwh);
  const maxKwh = Math.max(1, ...rows.map((r) => r.kwh));
  return rows.map((r, i) => ({
    ...r,
    rank: i + 1,
    // 100 = most efficient in the building, scaled down by relative consumption.
    ecoScore: Math.max(10, Math.round(100 - (r.kwh / maxKwh) * 60)),
  }));
}

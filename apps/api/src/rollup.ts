import { prisma, type AggregatePeriod } from "@satu-atap/db";
import { COUNTER_METRICS } from "@satu-atap/shared";

function utcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function utcWeekStart(d: Date): Date {
  const x = utcDay(d);
  const day = x.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  x.setUTCDate(x.getUTCDate() - offset);
  return x;
}

function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function nextMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

function isDeltaMetric(metric: string): boolean {
  return metric.endsWith("_delta");
}

function isCounterMetric(metric: string): boolean {
  return (COUNTER_METRICS as readonly string[]).includes(metric);
}

function isInstantMetric(metric: string): boolean {
  return (INSTANT_METRICS as readonly string[]).includes(metric);
}

export function periodWindow(
  period: "day" | "week" | "month",
  at: Date
): { start: Date; end: Date } {
  if (period === "day") {
    const start = utcDay(at);
    return { start, end: addDays(start, 1) };
  }
  if (period === "week") {
    const start = utcWeekStart(at);
    return { start, end: addDays(start, 7) };
  }
  const start = utcMonthStart(at);
  return { start, end: nextMonth(start) };
}

export async function rollupRange(
  period: Exclude<AggregatePeriod, "hour">,
  start: Date,
  end: Date
) {
  const hours = await prisma.telemetryAggregate.findMany({
    where: { period: "hour", periodStart: { gte: start, lt: end } },
  });
  const groups = new Map<string, typeof hours>();
  for (const row of hours) {
    const key = `${row.deviceId}:${row.metric}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  for (const [, rows] of groups) {
    const first = rows[0];
    rows.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
    const sampleCount = rows.reduce((s, r) => s + r.sampleCount, 0);
    let avg = 0;
    let min = 0;
    let max = 0;
    let sum = 0;
    let last = 0;
    let firstVal: number | null = null;

    if (isDeltaMetric(first.metric)) {
      sum = rows.reduce((s, r) => s + r.sum, 0);
    } else if (isCounterMetric(first.metric)) {
      firstVal = rows[0].first ?? rows[0].last;
      last = rows[rows.length - 1].last;
    } else {
      min = Math.min(...rows.map((r) => r.min));
      max = Math.max(...rows.map((r) => r.max));
      const weight = rows.reduce((s, r) => s + r.avg * r.sampleCount, 0);
      avg = sampleCount > 0 ? weight / sampleCount : 0;
      last = rows[rows.length - 1].last;
      firstVal = rows[0].first ?? rows[0].avg;
    }

    await prisma.telemetryAggregate.upsert({
      where: {
        deviceId_period_periodStart_metric: {
          deviceId: first.deviceId,
          period,
          periodStart: start,
          metric: first.metric,
        },
      },
      create: {
        homeId: first.homeId,
        deviceId: first.deviceId,
        period,
        periodStart: start,
        metric: first.metric,
        avg,
        min,
        max,
        sum,
        last,
        first: firstVal,
        sampleCount,
      },
      update: { avg, min, max, sum, last, first: firstVal, sampleCount },
    });
  }
}

export async function rollupNow(at = new Date()) {
  const day = periodWindow("day", at);
  const prevDay = periodWindow("day", addDays(utcDay(at), -1));
  const week = periodWindow("week", at);
  const prevWeek = periodWindow("week", addDays(utcWeekStart(at), -7));
  const month = periodWindow("month", at);
  const prevMonth = periodWindow("month", new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - 1, 1)));

  await rollupRange("day", day.start, day.end);
  await rollupRange("day", prevDay.start, prevDay.end);
  await rollupRange("week", week.start, week.end);
  await rollupRange("week", prevWeek.start, prevWeek.end);
  await rollupRange("month", month.start, month.end);
  await rollupRange("month", prevMonth.start, prevMonth.end);
}

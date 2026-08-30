import { prisma, type AggregatePeriod } from "@satu-atap/db";
import { COUNTER_METRICS } from "@satu-atap/shared";

/** Hourly job; lookback is slightly wider so readings between ticks are not skipped. */
export const DEFAULT_ROLLUP_LOOKBACK_MS = 75 * 60 * 1000;
export const DEFAULT_CATCH_UP_CAP = 60;

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

export type PeriodKind = "day" | "week" | "month";

export type RollupWindow = {
  period: PeriodKind;
  start: Date;
  end: Date;
};

export type RollupNowOptions = {
  lookbackMs?: number;
  catchUpCap?: number;
};

export type RollupNowResult = {
  catchUpDays: Date[];
  catchUpCapped: boolean;
  windows: RollupWindow[];
};

export function periodWindow(period: PeriodKind, at: Date): RollupWindow {
  if (period === "day") {
    const start = utcDay(at);
    return { period, start, end: addDays(start, 1) };
  }
  if (period === "week") {
    const start = utcWeekStart(at);
    return { period, start, end: addDays(start, 7) };
  }
  const start = utcMonthStart(at);
  return { period, start, end: nextMonth(start) };
}

function windowKey(w: RollupWindow): string {
  return `${w.period}:${w.start.toISOString()}`;
}

function currentAndPreviousWindows(at: Date): RollupWindow[] {
  return [
    periodWindow("day", at),
    periodWindow("day", addDays(utcDay(at), -1)),
    periodWindow("week", at),
    periodWindow("week", addDays(utcWeekStart(at), -7)),
    periodWindow("month", at),
    periodWindow("month", new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - 1, 1))),
  ];
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

async function distinctUtcDaysFromRecentIngest(since: Date, until: Date): Promise<Date[]> {
  const rows = await prisma.telemetryReading.findMany({
    where: { createdAt: { gte: since, lte: until } },
    select: { recordedAt: true },
  });
  const days = new Map<number, Date>();
  for (const row of rows) {
    const day = utcDay(row.recordedAt);
    days.set(day.getTime(), day);
  }
  return [...days.values()].sort((a, b) => a.getTime() - b.getTime());
}

function catchUpWindowsForDays(
  days: Date[],
  coveredKeys: Set<string>,
  cap: number
): { windows: RollupWindow[]; usedDays: Date[]; capped: boolean } {
  const windows: RollupWindow[] = [];
  const seen = new Set<string>();
  const usedDays: Date[] = [];
  let capped = false;

  for (const day of days) {
    if (coveredKeys.has(windowKey(periodWindow("day", day)))) {
      continue;
    }
    const candidates = [
      periodWindow("day", day),
      periodWindow("week", day),
      periodWindow("month", day),
    ];
    const fresh = candidates.filter((w) => !seen.has(windowKey(w)));
    if (windows.length + fresh.length > cap) {
      capped = true;
      break;
    }
    for (const w of fresh) {
      seen.add(windowKey(w));
      windows.push(w);
    }
    usedDays.push(day);
  }

  return { windows, usedDays, capped };
}

export async function rollupNow(at = new Date(), options: RollupNowOptions = {}): Promise<RollupNowResult> {
  const lookbackMs = options.lookbackMs ?? DEFAULT_ROLLUP_LOOKBACK_MS;
  const catchUpCap = options.catchUpCap ?? DEFAULT_CATCH_UP_CAP;
  const since = new Date(at.getTime() - lookbackMs);

  const currentPrev = currentAndPreviousWindows(at);
  const coveredKeys = new Set(currentPrev.map(windowKey));

  const backlogDays = await distinctUtcDaysFromRecentIngest(since, at);
  const catchUp = catchUpWindowsForDays(backlogDays, coveredKeys, catchUpCap);

  if (catchUp.capped) {
    console.warn(
      JSON.stringify({
        msg: "Rollup catch-up cap reached",
        cap: catchUpCap,
        catchUpDays: catchUp.usedDays.length,
        omittedDays: backlogDays.filter((d) => !coveredKeys.has(windowKey(periodWindow("day", d)))).length -
          catchUp.usedDays.length,
      })
    );
  }

  const windows = [...catchUp.windows, ...currentPrev];
  for (const w of windows) {
    await rollupRange(w.period, w.start, w.end);
  }

  return {
    catchUpDays: catchUp.usedDays,
    catchUpCapped: catchUp.capped,
    windows,
  };
}

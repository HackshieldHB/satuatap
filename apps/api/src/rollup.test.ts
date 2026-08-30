import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { ingestTelemetry } from "./ingest.js";
import { periodWindow, rollupNow, rollupRange } from "./rollup.js";

const DEVICE_ID = "energy-main";
const HOME_ID = "home-1";
const BACKLOG_DEVICE = "water-kitchen";
const ORDERED_DEVICE = "water-main";
const BACKLOG_DAY = new Date("2098-03-10T00:00:00.000Z");

async function cleanupBacklogFixtures() {
  await prisma.telemetryReading.deleteMany({
    where: { deviceId: { in: [BACKLOG_DEVICE, ORDERED_DEVICE] }, recordedAt: { gte: BACKLOG_DAY, lt: new Date("2098-03-11T00:00:00.000Z") } },
  });
  await prisma.telemetryAggregate.deleteMany({
    where: {
      deviceId: { in: [BACKLOG_DEVICE, ORDERED_DEVICE] },
      periodStart: { gte: new Date("2098-03-01T00:00:00.000Z"), lt: new Date("2098-04-01T00:00:00.000Z") },
    },
  });
  await prisma.deviceCounterSnapshot.deleteMany({
    where: { deviceId: { in: [BACKLOG_DEVICE, ORDERED_DEVICE] }, metric: "volume_liters" },
  });
}

async function ingestSeries(deviceId: string) {
  const samples = [
    { recordedAt: new Date("2098-03-10T01:10:00.000Z"), volume_liters: 100 },
    { recordedAt: new Date("2098-03-10T02:10:00.000Z"), volume_liters: 140 },
    { recordedAt: new Date("2098-03-10T03:10:00.000Z"), volume_liters: 190 },
  ];
  for (const s of samples) {
    const result = await ingestTelemetry({
      homeId: HOME_ID,
      deviceId,
      recordedAt: s.recordedAt,
      metrics: { volume_liters: s.volume_liters },
    });
    expect(result.ok).toBe(true);
  }
}

describe("rollup", () => {
  const dayStart = new Date("2026-08-20T00:00:00.000Z");
  const hourA = new Date("2026-08-20T01:00:00.000Z");
  const hourB = new Date("2026-08-20T02:00:00.000Z");
  const hourLate = new Date("2026-08-20T23:00:00.000Z");

  afterAll(async () => {
    await prisma.telemetryAggregate.deleteMany({
      where: { deviceId: DEVICE_ID, periodStart: { gte: dayStart, lt: new Date("2026-08-21T00:00:00.000Z") } },
    });
  });

  it("is idempotent across reruns", async () => {
    await prisma.telemetryAggregate.deleteMany({
      where: { deviceId: DEVICE_ID, metric: "energy_kwh_delta", periodStart: { gte: dayStart, lt: new Date("2026-08-21T00:00:00.000Z") } },
    });
    await prisma.telemetryAggregate.createMany({
      data: [
        {
          homeId: HOME_ID,
          deviceId: DEVICE_ID,
          period: "hour",
          periodStart: hourA,
          metric: "energy_kwh_delta",
          avg: 0,
          min: 0,
          max: 0,
          sum: 0.4,
          last: 0,
          sampleCount: 12,
        },
        {
          homeId: HOME_ID,
          deviceId: DEVICE_ID,
          period: "hour",
          periodStart: hourB,
          metric: "energy_kwh_delta",
          avg: 0,
          min: 0,
          max: 0,
          sum: 0.6,
          last: 0,
          sampleCount: 12,
        },
      ],
    });
    await rollupRange("day", dayStart, new Date("2026-08-21T00:00:00.000Z"));
    await rollupRange("day", dayStart, new Date("2026-08-21T00:00:00.000Z"));
    const rows = await prisma.telemetryAggregate.findMany({
      where: { deviceId: DEVICE_ID, period: "day", periodStart: dayStart, metric: "energy_kwh_delta" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].sum).toBeCloseTo(1.0);
  });

  it("updates an already-computed day when a late hourly reading arrives", async () => {
    await prisma.telemetryAggregate.create({
      data: {
        homeId: HOME_ID,
        deviceId: DEVICE_ID,
        period: "hour",
        periodStart: hourLate,
        metric: "energy_kwh_delta",
        avg: 0,
        min: 0,
        max: 0,
        sum: 0.25,
        last: 0,
        sampleCount: 4,
      },
    });
    await rollupRange("day", dayStart, new Date("2026-08-21T00:00:00.000Z"));
    const row = await prisma.telemetryAggregate.findFirst({
      where: { deviceId: DEVICE_ID, period: "day", periodStart: dayStart, metric: "energy_kwh_delta" },
    });
    expect(row?.sum).toBeCloseTo(1.25);
  });
});

describe("rollup catch-up from createdAt", () => {
  afterAll(async () => {
    await cleanupBacklogFixtures();
  });

  it("recomputes a five-day-old day, week, and month from a late createdAt", async () => {
    await cleanupBacklogFixtures();
    await ingestSeries(BACKLOG_DEVICE);

    const at = new Date();
    const result = await rollupNow(at, { lookbackMs: 90 * 60 * 1000 });

    const expectedDay = periodWindow("day", BACKLOG_DAY);
    const expectedWeek = periodWindow("week", BACKLOG_DAY);
    const expectedMonth = periodWindow("month", BACKLOG_DAY);

    expect(result.catchUpDays.some((d) => d.getTime() === expectedDay.start.getTime())).toBe(true);
    expect(
      result.windows.some((w) => w.period === "day" && w.start.getTime() === expectedDay.start.getTime())
    ).toBe(true);
    expect(
      result.windows.some((w) => w.period === "week" && w.start.getTime() === expectedWeek.start.getTime())
    ).toBe(true);
    expect(
      result.windows.some((w) => w.period === "month" && w.start.getTime() === expectedMonth.start.getTime())
    ).toBe(true);

    const dayRow = await prisma.telemetryAggregate.findFirst({
      where: {
        deviceId: BACKLOG_DEVICE,
        period: "day",
        periodStart: expectedDay.start,
        metric: "volume_liters_delta",
      },
    });
    expect(dayRow).not.toBeNull();
    expect(dayRow?.sum).toBeCloseTo(90);

    const weekRow = await prisma.telemetryAggregate.findFirst({
      where: {
        deviceId: BACKLOG_DEVICE,
        period: "week",
        periodStart: expectedWeek.start,
        metric: "volume_liters_delta",
      },
    });
    expect(weekRow?.sum).toBeCloseTo(90);

    const monthRow = await prisma.telemetryAggregate.findFirst({
      where: {
        deviceId: BACKLOG_DEVICE,
        period: "month",
        periodStart: expectedMonth.start,
        metric: "volume_liters_delta",
      },
    });
    expect(monthRow?.sum).toBeCloseTo(90);
  });

  it("matches a full in-order ingest of the same readings", async () => {
    await cleanupBacklogFixtures();
    await ingestSeries(BACKLOG_DEVICE);
    await rollupNow(new Date(), { lookbackMs: 90 * 60 * 1000 });

    await ingestSeries(ORDERED_DEVICE);
    const day = periodWindow("day", BACKLOG_DAY);
    const week = periodWindow("week", BACKLOG_DAY);
    const month = periodWindow("month", BACKLOG_DAY);
    await rollupRange("day", day.start, day.end);
    await rollupRange("week", week.start, week.end);
    await rollupRange("month", month.start, month.end);

    const [backlogDay, orderedDay] = await Promise.all([
      prisma.telemetryAggregate.findFirst({
        where: { deviceId: BACKLOG_DEVICE, period: "day", periodStart: day.start, metric: "volume_liters_delta" },
      }),
      prisma.telemetryAggregate.findFirst({
        where: { deviceId: ORDERED_DEVICE, period: "day", periodStart: day.start, metric: "volume_liters_delta" },
      }),
    ]);
    expect(backlogDay?.sum).toBeCloseTo(orderedDay?.sum ?? NaN);
    expect(orderedDay?.sum).toBeCloseTo(90);
  });

  it("touches only the current and previous periods when there is no backlog", async () => {
    const at = new Date("2019-04-10T12:00:00.000Z");
    const result = await rollupNow(at, { lookbackMs: 90 * 60 * 1000 });
    expect(result.catchUpDays).toEqual([]);
    expect(result.catchUpCapped).toBe(false);
    expect(result.windows).toHaveLength(6);
    expect(result.windows.map((w) => `${w.period}:${w.start.toISOString()}`)).toEqual([
      `day:${periodWindow("day", at).start.toISOString()}`,
      `day:${periodWindow("day", new Date("2019-04-09T12:00:00.000Z")).start.toISOString()}`,
      `week:${periodWindow("week", at).start.toISOString()}`,
      `week:${periodWindow("week", new Date(periodWindow("week", at).start.getTime() - 7 * 24 * 60 * 60 * 1000)).start.toISOString()}`,
      `month:${periodWindow("month", at).start.toISOString()}`,
      `month:${periodWindow("month", new Date("2019-03-01T00:00:00.000Z")).start.toISOString()}`,
    ]);
  });

  it("changes nothing when rerun immediately", async () => {
    await cleanupBacklogFixtures();
    await ingestSeries(BACKLOG_DEVICE);
    await rollupNow(new Date(), { lookbackMs: 90 * 60 * 1000 });

    const before = await prisma.telemetryAggregate.findMany({
      where: {
        deviceId: BACKLOG_DEVICE,
        period: { in: ["day", "week", "month"] },
        periodStart: { gte: new Date("2098-03-01T00:00:00.000Z"), lt: new Date("2098-04-01T00:00:00.000Z") },
      },
      orderBy: [{ period: "asc" }, { periodStart: "asc" }, { metric: "asc" }],
    });
    expect(before.length).toBeGreaterThan(0);

    await rollupNow(new Date(), { lookbackMs: 90 * 60 * 1000 });
    const after = await prisma.telemetryAggregate.findMany({
      where: {
        deviceId: BACKLOG_DEVICE,
        period: { in: ["day", "week", "month"] },
        periodStart: { gte: new Date("2098-03-01T00:00:00.000Z"), lt: new Date("2098-04-01T00:00:00.000Z") },
      },
      orderBy: [{ period: "asc" }, { periodStart: "asc" }, { metric: "asc" }],
    });

    expect(after.map((r) => ({ ...r, id: undefined, updatedAt: undefined }))).toEqual(
      before.map((r) => ({ ...r, id: undefined, updatedAt: undefined }))
    );
  });
});


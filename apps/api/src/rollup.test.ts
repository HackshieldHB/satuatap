import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { rollupRange } from "./rollup.js";

const DEVICE_ID = "energy-main";
const HOME_ID = "home-1";

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

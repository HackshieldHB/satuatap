import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { ingestTelemetry } from "./ingest.js";

const DEVICE_ID = "tank-rooftop";
const HOME_ID = "home-1";

describe("tank level ingest", () => {
  const recordedAt = new Date("2026-08-25T06:00:00.000Z");

  afterAll(async () => {
    await prisma.telemetryReading.deleteMany({ where: { deviceId: DEVICE_ID, recordedAt } });
    await prisma.telemetryAggregate.deleteMany({
      where: { deviceId: DEVICE_ID, metric: "level_pct" },
    });
  });

  it("stores level_pct and aggregates it as an instant metric", async () => {
    await prisma.telemetryReading.deleteMany({ where: { deviceId: DEVICE_ID, recordedAt } });

    const res = await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt,
      metrics: { level_pct: 72.5, distance_cm: 14.2 },
    });
    expect(res.ok).toBe(true);

    const row = await prisma.telemetryReading.findFirst({
      where: { deviceId: DEVICE_ID, recordedAt },
    });
    expect((row?.metrics as { level_pct: number }).level_pct).toBe(72.5);

    // level_pct is in INSTANT_METRICS, so an hourly aggregate must exist.
    const agg = await prisma.telemetryAggregate.findFirst({
      where: { deviceId: DEVICE_ID, metric: "level_pct", period: "hour" },
    });
    expect(agg).not.toBeNull();
    expect(agg?.last).toBe(72.5);
  });
});

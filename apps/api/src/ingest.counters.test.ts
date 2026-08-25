import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { computeCounterDelta, ingestTelemetry } from "./ingest.js";

const DEVICE_ID = "energy-main";
const HOME_ID = "home-1";

describe("computeCounterDelta", () => {
  it("returns 0 on first reading", () => {
    expect(computeCounterDelta(null, 4.72, "energy_kwh").delta).toBe(0);
  });

  it("returns the increment on a normal step", () => {
    expect(computeCounterDelta(4.72, 4.78, "energy_kwh").delta).toBeCloseTo(0.06);
  });

  it("returns 0 and warns on reset", () => {
    const r = computeCounterDelta(4.78, 0.01, "energy_kwh");
    expect(r.delta).toBe(0);
    expect(r.warning).toBe("counter_reset");
  });

  it("returns 0 and warns on implausible jump", () => {
    const r = computeCounterDelta(4.72, 20, "energy_kwh");
    expect(r.delta).toBe(0);
    expect(r.warning).toBe("implausible_jump");
  });
});

describe("ingest counter deltas", () => {
  afterAll(async () => {
    await prisma.deviceCounterSnapshot.deleteMany({ where: { deviceId: DEVICE_ID, metric: "energy_kwh" } });
  });

  it("day consumption from deltas equals last-first when no reset", async () => {
    await prisma.deviceCounterSnapshot.deleteMany({ where: { deviceId: DEVICE_ID, metric: "energy_kwh" } });
    const base = Date.now();
    const values = [10.0, 10.02, 10.05, 10.11];
    for (let i = 0; i < values.length; i++) {
      await ingestTelemetry({
        homeId: HOME_ID,
        deviceId: DEVICE_ID,
        recordedAt: new Date(base + i * 1000),
        metrics: { energy_kwh: values[i], power: 400 },
      });
    }
    const rows = await prisma.telemetryReading.findMany({
      where: {
        deviceId: DEVICE_ID,
        recordedAt: { gte: new Date(base) },
      },
      orderBy: { recordedAt: "asc" },
    });
    const sumDelta = rows.reduce((acc, r) => {
      const d = (r.metrics as Record<string, unknown>).energy_kwh_delta;
      return acc + (typeof d === "number" ? d : 0);
    }, 0);
    expect(sumDelta).toBeCloseTo(values[values.length - 1] - values[0], 6);
    expect((rows[0].metrics as Record<string, unknown>).energy_kwh_delta).toBe(0);
  });
});

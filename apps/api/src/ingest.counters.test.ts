import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@satu-atap/db";
import { computeCounterDelta, ingestTelemetry } from "./ingest.js";

const DEVICE_ID = "energy-main";
const DEVICE_B = "energy-ac";
const HOME_ID = "home-1";
const WINDOW = new Date("2099-06-01T00:00:00.000Z");

async function cleanup() {
  await prisma.telemetryReading.deleteMany({
    where: { deviceId: { in: [DEVICE_ID, DEVICE_B] }, recordedAt: { gte: WINDOW } },
  });
  await prisma.telemetryAggregate.deleteMany({
    where: { deviceId: { in: [DEVICE_ID, DEVICE_B] }, periodStart: { gte: WINDOW } },
  });
  await prisma.deviceCounterSnapshot.deleteMany({
    where: { deviceId: { in: [DEVICE_ID, DEVICE_B] }, metric: "energy_kwh" },
  });
}

function hourStart(d: Date): string {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x.toISOString();
}

async function sumDeltas(deviceId: string) {
  const rows = await prisma.telemetryReading.findMany({
    where: { deviceId, recordedAt: { gte: WINDOW } },
    orderBy: { recordedAt: "asc" },
  });
  const sum = rows.reduce((acc, r) => {
    const d = (r.metrics as Record<string, unknown>).energy_kwh_delta;
    return acc + (typeof d === "number" ? d : 0);
  }, 0);
  const byHour: Record<string, number> = {};
  for (const r of rows) {
    const key = hourStart(r.recordedAt);
    const d = (r.metrics as Record<string, unknown>).energy_kwh_delta;
    byHour[key] = (byHour[key] ?? 0) + (typeof d === "number" ? d : 0);
  }
  return { rows, sum, byHour };
}

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
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("day consumption from deltas equals last-first when no reset", async () => {
    const base = WINDOW.getTime();
    const values = [10.0, 10.02, 10.05, 10.11];
    for (let i = 0; i < values.length; i++) {
      await ingestTelemetry({
        homeId: HOME_ID,
        deviceId: DEVICE_ID,
        recordedAt: new Date(base + i * 1000),
        metrics: { energy_kwh: values[i], power: 400 },
      });
    }
    const { rows, sum } = await sumDeltas(DEVICE_ID);
    expect(sum).toBeCloseTo(values[values.length - 1] - values[0], 6);
    expect((rows[0].metrics as Record<string, unknown>).energy_kwh_delta).toBe(0);
  });

  it("computes an out-of-order reading against its true predecessor, not the snapshot", async () => {
    const t1 = new Date(WINDOW.getTime());
    const t2 = new Date(WINDOW.getTime() + 60_000);
    const t3 = new Date(WINDOW.getTime() + 120_000);
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t1,
      metrics: { energy_kwh: 10 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t3,
      metrics: { energy_kwh: 12 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t2,
      metrics: { energy_kwh: 11 },
    });
    const mid = await prisma.telemetryReading.findFirst({
      where: { deviceId: DEVICE_ID, recordedAt: t2 },
    });
    expect((mid?.metrics as Record<string, unknown>).energy_kwh_delta).toBeCloseTo(1);
  });

  it("does not rewind the snapshot when an out-of-order reading arrives", async () => {
    const t1 = new Date(WINDOW.getTime());
    const t2 = new Date(WINDOW.getTime() + 60_000);
    const t3 = new Date(WINDOW.getTime() + 120_000);
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t1,
      metrics: { energy_kwh: 10 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t3,
      metrics: { energy_kwh: 12 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t2,
      metrics: { energy_kwh: 11 },
    });
    const snap = await prisma.deviceCounterSnapshot.findUnique({
      where: { deviceId_metric: { deviceId: DEVICE_ID, metric: "energy_kwh" } },
    });
    expect(snap?.value).toBe(12);
    expect(snap?.recordedAt.toISOString()).toBe(t3.toISOString());
  });

  it("keeps SUM(deltas) = highest-lowest after out-of-order then in-order readings", async () => {
    const t1 = new Date(WINDOW.getTime());
    const t2 = new Date(WINDOW.getTime() + 60_000);
    const t3 = new Date(WINDOW.getTime() + 120_000);
    const t4 = new Date(WINDOW.getTime() + 180_000);
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t1,
      metrics: { energy_kwh: 10 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t3,
      metrics: { energy_kwh: 12 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t2,
      metrics: { energy_kwh: 11 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t4,
      metrics: { energy_kwh: 13 },
    });
    const { sum } = await sumDeltas(DEVICE_ID);
    expect(sum).toBeCloseTo(13 - 10, 6);
  });

  it("detects a genuine in-order counter reset and logs at warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const t1 = new Date(WINDOW.getTime());
    const t2 = new Date(WINDOW.getTime() + 60_000);
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t1,
      metrics: { energy_kwh: 10 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t2,
      metrics: { energy_kwh: 0.5 },
    });
    const payload = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(payload).toContain("counter_reset");
    const row = await prisma.telemetryReading.findFirst({
      where: { deviceId: DEVICE_ID, recordedAt: t2 },
    });
    expect((row?.metrics as Record<string, unknown>).energy_kwh_delta).toBe(0);
  });

  it("logs out-of-order arrivals at info and does not log counter_reset", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const t1 = new Date(WINDOW.getTime());
    const t2 = new Date(WINDOW.getTime() + 60_000);
    const t3 = new Date(WINDOW.getTime() + 120_000);
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t1,
      metrics: { energy_kwh: 10 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t3,
      metrics: { energy_kwh: 12 },
    });
    await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt: t2,
      metrics: { energy_kwh: 11 },
    });
    const infoPayload = info.mock.calls.map((c) => String(c[0])).join("\n");
    const warnPayload = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(infoPayload).toContain("out_of_order");
    expect(warnPayload).not.toContain("counter_reset");
  });

  it("shuffled ingest matches in-order daily total and per-hour distribution", async () => {
    const readings = [];
    for (let i = 0; i < 12; i++) {
      readings.push({
        recordedAt: new Date(WINDOW.getTime() + i * 10 * 60_000),
        energy_kwh: 20 + i * 0.05,
      });
    }
    for (const r of readings) {
      await ingestTelemetry({
        homeId: HOME_ID,
        deviceId: DEVICE_ID,
        recordedAt: r.recordedAt,
        metrics: { energy_kwh: r.energy_kwh },
      });
    }
    const ordered = await sumDeltas(DEVICE_ID);

    const shuffledIdx = [7, 1, 11, 0, 4, 9, 2, 8, 5, 10, 3, 6];
    for (const i of shuffledIdx) {
      const r = readings[i];
      await ingestTelemetry({
        homeId: HOME_ID,
        deviceId: DEVICE_B,
        recordedAt: r.recordedAt,
        metrics: { energy_kwh: r.energy_kwh },
      });
    }
    const shuffled = await sumDeltas(DEVICE_B);
    expect(shuffled.sum).toBeCloseTo(ordered.sum, 6);
    expect(shuffled.sum).toBeCloseTo(readings[11].energy_kwh - readings[0].energy_kwh, 6);
    expect(Object.keys(shuffled.byHour).sort()).toEqual(Object.keys(ordered.byHour).sort());
    for (const hour of Object.keys(ordered.byHour)) {
      expect(shuffled.byHour[hour]).toBeCloseTo(ordered.byHour[hour], 6);
    }
  });
});

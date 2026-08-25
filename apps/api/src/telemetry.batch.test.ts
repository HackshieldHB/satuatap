import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { ingestTelemetry } from "./ingest.js";
import { buildApp } from "./app.js";

const DEVICE_ID = "energy-main";
const HOME_ID = "home-1";
const KEY = process.env.INTERNAL_API_KEY ?? "local-internal-key";

describe("telemetry batch idempotency", () => {
  const recordedAt = new Date("2026-08-25T04:00:00.000Z");

  afterAll(async () => {
    await prisma.telemetryReading.deleteMany({
      where: { deviceId: DEVICE_ID, recordedAt },
    });
  });

  it("posting the same batch twice yields one row and unchanged consumption", async () => {
    await prisma.telemetryReading.deleteMany({
      where: { deviceId: DEVICE_ID, recordedAt },
    });
    const payload = {
      ts: recordedAt.toISOString(),
      metrics: { energy_kwh: 12.5, power: 400 },
    };
    const first = await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt,
      metrics: payload.metrics,
    });
    const second = await ingestTelemetry({
      homeId: HOME_ID,
      deviceId: DEVICE_ID,
      recordedAt,
      metrics: { energy_kwh: 99, power: 900 },
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.id).toBe(first.id);
    }
    const rows = await prisma.telemetryReading.findMany({
      where: { deviceId: DEVICE_ID, recordedAt },
    });
    expect(rows).toHaveLength(1);
    expect((rows[0].metrics as { energy_kwh: number }).energy_kwh).toBe(12.5);

    const app = await buildApp();
    const batch = {
      items: [
        { homeId: HOME_ID, deviceId: DEVICE_ID, payload },
        { homeId: HOME_ID, deviceId: DEVICE_ID, payload },
      ],
    };
    const res = await app.inject({
      method: "POST",
      url: "/internal/telemetry/batch",
      headers: { "x-internal-key": KEY },
      payload: batch,
    });
    expect(res.statusCode).toBe(200);
    const again = await prisma.telemetryReading.findMany({
      where: { deviceId: DEVICE_ID, recordedAt },
    });
    expect(again).toHaveLength(1);
    await app.close();
  });
});

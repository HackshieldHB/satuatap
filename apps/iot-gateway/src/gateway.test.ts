import { describe, expect, it } from "vitest";
import { parseMqttTopic, telemetryPayloadSchema } from "@satu-atap/shared";

describe("gateway contracts", () => {
  it("accepts telemetry topics", () => {
    expect(parseMqttTopic("satuatap/home-1/dev-energy/telemetry")?.channel).toBe(
      "telemetry"
    );
  });
  it("rejects extra metric keys", () => {
    const r = telemetryPayloadSchema.safeParse({
      ts: "2026-08-25T05:00:00.000Z",
      metrics: { watts_raw: 1 },
    });
    expect(r.success).toBe(false);
  });
});

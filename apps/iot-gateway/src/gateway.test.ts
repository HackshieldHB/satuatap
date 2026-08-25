import { describe, expect, it } from "vitest";
import {
  parseMqttTopic,
  telemetryPayloadSchema,
  statePayloadSchema,
  eventPayloadSchema,
  ackPayloadSchema,
  availabilityPayloadSchema,
} from "@satu-atap/shared";

describe("gateway contracts", () => {
  it("accepts telemetry topics", () => {
    expect(parseMqttTopic("home/home-1/device/dev-energy/telemetry")).toEqual({
      kind: "device",
      homeId: "home-1",
      deviceId: "dev-energy",
      channel: "telemetry",
    });
  });

  it("accepts state topics", () => {
    expect(parseMqttTopic("home/home-1/device/dev-light-living/state")?.channel).toBe("state");
    expect(
      statePayloadSchema.safeParse({
        ts: "2026-08-25T05:00:00.000Z",
        metrics: { on: true },
      }).success
    ).toBe(true);
  });

  it("accepts command topics", () => {
    expect(parseMqttTopic("home/home-1/device/dev-light-living/command")?.channel).toBe(
      "command"
    );
  });

  it("accepts ack topics", () => {
    expect(parseMqttTopic("home/home-1/device/dev-light-living/ack")?.channel).toBe("ack");
    expect(
      ackPayloadSchema.safeParse({ commandId: "c1", status: "SUCCEEDED" }).success
    ).toBe(true);
  });

  it("accepts event topics", () => {
    expect(parseMqttTopic("home/home-1/device/dev-pir-living/event")?.channel).toBe("event");
    expect(
      eventPayloadSchema.safeParse({
        ts: "2026-08-25T05:00:00.000Z",
        event: "MOTION_DETECTED",
      }).success
    ).toBe(true);
  });

  it("accepts node availability topics", () => {
    expect(parseMqttTopic("home/home-1/node/esp32-lighting-001/availability")).toEqual({
      kind: "node",
      homeId: "home-1",
      nodeId: "esp32-lighting-001",
    });
    expect(
      availabilityPayloadSchema.safeParse({
        status: "online",
        mac: "AA:BB:CC:DD:EE:FF",
      }).success
    ).toBe(true);
  });

  it("rejects extra metric keys", () => {
    const r = telemetryPayloadSchema.safeParse({
      ts: "2026-08-25T05:00:00.000Z",
      metrics: { watts_raw: 1 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects client-supplied delta keys at the gateway boundary", () => {
    const payload = {
      ts: "2026-08-25T05:00:00.000Z",
      metrics: { energy_kwh: 4.72, energy_kwh_delta: 0.01 },
    };
    const parsed = telemetryPayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(Object.keys(parsed.data.metrics).some((k) => k.endsWith("_delta"))).toBe(true);
    }
  });
});

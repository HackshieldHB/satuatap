import { describe, expect, it } from "vitest";
import { DEFAULT_CAPABILITIES, hasCapability } from "./capabilities.js";
import { parseMqttTopic, mqttTopic } from "./mqtt.js";
import { telemetryPayloadSchema } from "./schemas.js";

describe("capabilities", () => {
  it("energy meters expose power", () => {
    expect(hasCapability(DEFAULT_CAPABILITIES.energy_meter, "power")).toBe(true);
  });
  it("water meters expose flow", () => {
    expect(hasCapability(DEFAULT_CAPABILITIES.water_meter, "flow")).toBe(true);
  });
  it("environment sensors expose temperature", () => {
    expect(hasCapability(DEFAULT_CAPABILITIES.environment_sensor, "temperature")).toBe(
      true
    );
  });
  it("lights expose on_off", () => {
    expect(hasCapability(DEFAULT_CAPABILITIES.light, "on_off")).toBe(true);
  });
});

describe("mqtt topics", () => {
  it("round-trips home and device ids", () => {
    const t = mqttTopic("home-1", "dev-energy", "telemetry");
    expect(parseMqttTopic(t)).toEqual({
      homeId: "home-1",
      deviceId: "dev-energy",
      channel: "telemetry",
    });
  });
  it("rejects invalid topics", () => {
    expect(parseMqttTopic("foo/bar")).toBeNull();
  });
});

describe("telemetry schema", () => {
  it("accepts normalized energy metrics", () => {
    const parsed = telemetryPayloadSchema.parse({
      ts: "2026-08-25T05:00:00.000Z",
      metrics: { voltage: 220.4, current: 2.13, power: 469.4, energy_kwh: 4.72 },
    });
    expect(parsed.metrics.power).toBe(469.4);
  });
  it("rejects unknown metric keys", () => {
    expect(() =>
      telemetryPayloadSchema.parse({
        ts: "2026-08-25T05:00:00.000Z",
        metrics: { pzem_raw: 1 },
      })
    ).toThrow();
  });
});

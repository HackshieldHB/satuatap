import { describe, expect, it } from "vitest";
import {
  mqttTopic,
  nodeAvailabilityTopic,
  parseMqttTopic,
  type MqttChannel,
} from "./mqtt.js";

const CHANNELS: MqttChannel[] = ["telemetry", "state", "command", "ack", "event"];

describe("mqtt topics", () => {
  it.each(CHANNELS)("round-trips device channel %s", (channel) => {
    const topic = mqttTopic("home-1", "dev-energy", channel);
    expect(parseMqttTopic(topic)).toEqual({
      kind: "device",
      homeId: "home-1",
      deviceId: "dev-energy",
      channel,
    });
  });

  it("round-trips node availability", () => {
    const topic = nodeAvailabilityTopic("home-1", "esp32-energy-001");
    expect(parseMqttTopic(topic)).toEqual({
      kind: "node",
      homeId: "home-1",
      nodeId: "esp32-energy-001",
    });
  });

  it("rejects wrong prefix", () => {
    expect(parseMqttTopic("satuatap/home-1/device/dev-energy/telemetry")).toBeNull();
  });

  it("rejects too few segments", () => {
    expect(parseMqttTopic("home/home-1/device/dev-energy")).toBeNull();
  });

  it("rejects too many segments", () => {
    expect(parseMqttTopic("home/home-1/device/dev-energy/telemetry/extra")).toBeNull();
  });

  it("rejects unknown channel", () => {
    expect(parseMqttTopic("home/home-1/device/dev-energy/status")).toBeNull();
    expect(parseMqttTopic("home/home-1/device/dev-energy/cmd")).toBeNull();
  });

  it("rejects empty ids", () => {
    expect(parseMqttTopic("home//device/dev-energy/telemetry")).toBeNull();
    expect(parseMqttTopic("home/home-1/device//telemetry")).toBeNull();
    expect(parseMqttTopic("home/home-1/node//availability")).toBeNull();
  });
});

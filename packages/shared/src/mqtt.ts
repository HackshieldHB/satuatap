export const MQTT_PREFIX = "home";

export type MqttChannel = "telemetry" | "state" | "command" | "ack" | "event";

export const DEVICE_CHANNELS = [
  "telemetry",
  "state",
  "command",
  "ack",
  "event",
] as const satisfies readonly MqttChannel[];

function isDeviceChannel(value: string): value is MqttChannel {
  return (DEVICE_CHANNELS as readonly string[]).includes(value);
}

export function mqttTopic(
  homeId: string,
  deviceId: string,
  channel: MqttChannel
): string {
  return `${MQTT_PREFIX}/${homeId}/device/${deviceId}/${channel}`;
}

export function nodeAvailabilityTopic(homeId: string, nodeId: string): string {
  return `${MQTT_PREFIX}/${homeId}/node/${nodeId}/availability`;
}

export type ParsedMqttTopic =
  | { kind: "device"; homeId: string; deviceId: string; channel: MqttChannel }
  | { kind: "node"; homeId: string; nodeId: string };

export function parseMqttTopic(topic: string): ParsedMqttTopic | null {
  const parts = topic.split("/");
  if (parts.length !== 5) return null;
  if (parts[0] !== MQTT_PREFIX) return null;
  const homeId = parts[1];
  if (!homeId) return null;

  if (parts[2] === "device") {
    const deviceId = parts[3];
    const channel = parts[4];
    if (!deviceId || !isDeviceChannel(channel)) return null;
    return { kind: "device", homeId, deviceId, channel };
  }

  if (parts[2] === "node") {
    const nodeId = parts[3];
    if (!nodeId || parts[4] !== "availability") return null;
    return { kind: "node", homeId, nodeId };
  }

  return null;
}

export const MQTT_WILDCARD_TELEMETRY = `${MQTT_PREFIX}/+/device/+/telemetry`;
export const MQTT_WILDCARD_STATE = `${MQTT_PREFIX}/+/device/+/state`;
export const MQTT_WILDCARD_COMMAND = `${MQTT_PREFIX}/+/device/+/command`;
export const MQTT_WILDCARD_ACK = `${MQTT_PREFIX}/+/device/+/ack`;
export const MQTT_WILDCARD_EVENT = `${MQTT_PREFIX}/+/device/+/event`;
export const MQTT_WILDCARD_NODE_AVAILABILITY = `${MQTT_PREFIX}/+/node/+/availability`;

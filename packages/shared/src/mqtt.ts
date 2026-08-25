export const MQTT_PREFIX = "satuatap";

export type MqttChannel = "telemetry" | "status" | "cmd" | "ack";

export function mqttTopic(
  homeId: string,
  deviceId: string,
  channel: MqttChannel
): string {
  return `${MQTT_PREFIX}/${homeId}/${deviceId}/${channel}`;
}

export function parseMqttTopic(topic: string): {
  homeId: string;
  deviceId: string;
  channel: MqttChannel;
} | null {
  const parts = topic.split("/");
  if (parts.length !== 4 || parts[0] !== MQTT_PREFIX) return null;
  const channel = parts[3];
  if (
    channel !== "telemetry" &&
    channel !== "status" &&
    channel !== "cmd" &&
    channel !== "ack"
  ) {
    return null;
  }
  return { homeId: parts[1], deviceId: parts[2], channel };
}

export const MQTT_WILDCARD_TELEMETRY = `${MQTT_PREFIX}/+/+/telemetry`;
export const MQTT_WILDCARD_STATUS = `${MQTT_PREFIX}/+/+/status`;
export const MQTT_WILDCARD_ACK = `${MQTT_PREFIX}/+/+/ack`;

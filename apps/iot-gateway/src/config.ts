export const MQTT_URL = process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883";
export const MQTT_USERNAME = process.env.MQTT_USERNAME ?? "gateway";
export const MQTT_PASSWORD = process.env.MQTT_PASSWORD ?? "local-dev-mqtt-gateway";
export const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";
export const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "local-internal-key";
export const PORT = Number(process.env.PORT ?? 3100);
export const HOME_ID = process.env.HOME_ID ?? "home-1";
export const EDGE_DB_PATH = process.env.EDGE_DB_PATH ?? "edge.sqlite";
export const EDGE_LOCAL_TOKEN = process.env.EDGE_LOCAL_TOKEN ?? "local-edge-token";

export function log(level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify({ level, msg, ...extra, ts: new Date().toISOString() }));
}

export function isMqttAuthRejection(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("not authorized") ||
    msg.includes("bad username or password") ||
    msg.includes("bad user name or password") ||
    /\bconnack\b.*\b5\b/.test(msg)
  );
}

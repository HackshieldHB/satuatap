import mqtt from "mqtt";
import Fastify from "fastify";
import {
  MQTT_WILDCARD_ACK,
  MQTT_WILDCARD_STATUS,
  MQTT_WILDCARD_TELEMETRY,
  mqttTopic,
  parseMqttTopic,
  telemetryPayloadSchema,
  deviceStatusPayloadSchema,
  ackPayloadSchema,
  commandPayloadSchema,
} from "@satu-atap/shared";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "local-internal-key";
const PORT = Number(process.env.PORT ?? 3100);

let mqttReady = false;
const client = mqtt.connect(MQTT_URL, {
  clientId: `satuatap-gateway-${process.pid}`,
  reconnectPeriod: 2000,
  will: {
    topic: "satuatap/gateway/status",
    payload: JSON.stringify({ status: "offline" }),
    qos: 1,
    retain: false,
  },
});

function log(msg: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify({ msg, ...extra, ts: new Date().toISOString() }));
}

async function apiPost(path: string, body: unknown) {
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": INTERNAL_API_KEY,
    },
    body: JSON.stringify(body),
  });
}

client.on("connect", () => {
  mqttReady = true;
  log("MQTT connected");
  client.subscribe(
    [MQTT_WILDCARD_TELEMETRY, MQTT_WILDCARD_STATUS, MQTT_WILDCARD_ACK],
    { qos: 1 },
    (err) => {
      if (err) log("MQTT subscribe error", { error: err.message });
    }
  );
});

client.on("reconnect", () => log("MQTT reconnecting"));
client.on("close", () => {
  mqttReady = false;
  log("MQTT disconnected");
});
client.on("error", (err) => log("MQTT error", { error: err.message }));

client.on("message", async (topic, payload) => {
  const parsedTopic = parseMqttTopic(topic);
  if (!parsedTopic) return;
  let json: unknown;
  try {
    json = JSON.parse(payload.toString());
  } catch {
    log("Telemetry rejected", { reason: "invalid_json", topic });
    return;
  }

  const { homeId, deviceId, channel } = parsedTopic;

  if (channel === "telemetry") {
    const ok = telemetryPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("Telemetry rejected", { deviceId, reason: "schema" });
      return;
    }
    const res = await apiPost("/internal/telemetry", {
      homeId,
      deviceId,
      payload: ok.data,
    });
    if (!res.ok) log("Telemetry persist failed", { deviceId, status: res.status });
    return;
  }

  if (channel === "status") {
    const ok = deviceStatusPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("Status rejected", { deviceId });
      return;
    }
    await apiPost("/internal/status", { homeId, deviceId, payload: ok.data });
    return;
  }

  if (channel === "ack") {
    const ok = ackPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("ACK rejected", { deviceId });
      return;
    }
    await apiPost("/internal/ack", ok.data);
  }
});

async function publishCommand(commandId: string) {
  const pending = await fetch(`${API_URL}/internal/commands/pending`, {
    headers: { "x-internal-key": INTERNAL_API_KEY },
  });
  if (!pending.ok) return;
  const body = (await pending.json()) as {
    data: Array<{
      id: string;
      homeId: string;
      deviceId: string;
      type: string;
      params: Record<string, unknown>;
      idempotencyKey: string;
    }>;
  };
  const target = body.data.find((c) => c.id === commandId);
  if (!target) return;
  const payload = commandPayloadSchema.parse({
    commandId: target.id,
    type: target.type as "TURN_ON" | "TURN_OFF" | "SET_VALUE" | "SET_BRIGHTNESS",
    params: target.params ?? {},
    idempotencyKey: target.idempotencyKey,
  });
  const topic = mqttTopic(target.homeId, target.deviceId, "cmd");
  await new Promise<void>((resolve, reject) => {
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  await apiPost(`/internal/commands/${target.id}/sent`, {});
  log("Command sent", { commandId: target.id, topic });
}

async function pollPending() {
  if (!mqttReady) return;
  try {
    const pending = await fetch(`${API_URL}/internal/commands/pending`, {
      headers: { "x-internal-key": INTERNAL_API_KEY },
    });
    if (!pending.ok) return;
    const body = (await pending.json()) as { data: Array<{ id: string }> };
    for (const c of body.data) {
      await publishCommand(c.id);
    }
  } catch {
    // API may still be starting
  }
}

setInterval(() => {
  pollPending().catch(() => undefined);
}, 2000);

const http = Fastify({ logger: false });

http.get("/health", async () => ({
  status: mqttReady ? "healthy" : "degraded",
  mqtt: mqttReady ? "up" : "down",
}));

http.post("/internal/publish-command", async (req, reply) => {
  const key = req.headers["x-internal-key"];
  if (key !== INTERNAL_API_KEY) return reply.code(401).send({ error: "Unauthorized" });
  const { commandId } = req.body as { commandId: string };
  await publishCommand(commandId);
  return { success: true };
});

await http.listen({ port: PORT, host: "0.0.0.0" });
log("Gateway HTTP listening", { port: PORT });

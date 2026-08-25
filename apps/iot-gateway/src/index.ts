import mqtt from "mqtt";
import Fastify from "fastify";
import {
  MQTT_WILDCARD_ACK,
  MQTT_WILDCARD_COMMAND,
  MQTT_WILDCARD_EVENT,
  MQTT_WILDCARD_NODE_AVAILABILITY,
  MQTT_WILDCARD_STATE,
  MQTT_WILDCARD_TELEMETRY,
  mqttTopic,
  nodeAvailabilityTopic,
  parseMqttTopic,
  telemetryPayloadSchema,
  statePayloadSchema,
  ackPayloadSchema,
  eventPayloadSchema,
  availabilityPayloadSchema,
  commandPayloadSchema,
} from "@satu-atap/shared";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883";
const MQTT_USERNAME = process.env.MQTT_USERNAME ?? "gateway";
const MQTT_PASSWORD = process.env.MQTT_PASSWORD ?? "local-dev-mqtt-gateway";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "local-internal-key";
const PORT = Number(process.env.PORT ?? 3100);
const HOME_ID = process.env.HOME_ID ?? "home-1";

function isMqttAuthRejection(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("not authorized") ||
    msg.includes("bad username or password") ||
    msg.includes("bad user name or password") ||
    /\bconnack\b.*\b5\b/.test(msg)
  );
}

let mqttReady = false;
let mqttAuthRejected = false;
const client = mqtt.connect(MQTT_URL, {
  clientId: `satuatap-gateway-${process.pid}`,
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  reconnectPeriod: 2000,
  will: {
    topic: nodeAvailabilityTopic(HOME_ID, "gateway"),
    payload: JSON.stringify({ status: "offline" }),
    qos: 1,
    retain: true,
  },
});

function log(level: "info" | "warn", msg: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify({ level, msg, ...extra, ts: new Date().toISOString() }));
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
  log("info", "MQTT connected");
  client.publish(
    nodeAvailabilityTopic(HOME_ID, "gateway"),
    JSON.stringify({ status: "online", firmware: "gateway-1.0.0" }),
    { qos: 1, retain: true }
  );
  client.subscribe(
    [
      MQTT_WILDCARD_TELEMETRY,
      MQTT_WILDCARD_STATE,
      MQTT_WILDCARD_COMMAND,
      MQTT_WILDCARD_ACK,
      MQTT_WILDCARD_EVENT,
      MQTT_WILDCARD_NODE_AVAILABILITY,
    ],
    { qos: 1 },
    (err) => {
      if (err) log("warn", "MQTT subscribe error", { error: err.message });
    }
  );
});

client.on("reconnect", () => {
  if (mqttAuthRejected) {
    client.end(true);
    return;
  }
  log("info", "MQTT reconnecting");
});
client.on("close", () => {
  mqttReady = false;
  log("info", "MQTT disconnected");
});
client.on("error", (err) => {
  if (isMqttAuthRejection(err)) {
    mqttAuthRejected = true;
    log("warn", "MQTT authentication rejected; not retrying", { error: err.message });
    client.end(true);
    process.exitCode = 1;
    return;
  }
  log("warn", "MQTT error", { error: err.message });
});

client.on("message", async (topic, payload) => {
  const parsedTopic = parseMqttTopic(topic);
  if (!parsedTopic) return;
  let json: unknown;
  try {
    json = JSON.parse(payload.toString());
  } catch {
    log("warn", "Payload rejected", { reason: "invalid_json", topic });
    return;
  }

  if (parsedTopic.kind === "node") {
    if (parsedTopic.nodeId === "gateway") return;
    const ok = availabilityPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("warn", "Availability rejected", { nodeId: parsedTopic.nodeId, reason: "schema" });
      return;
    }
    const res = await apiPost("/internal/availability", {
      homeId: parsedTopic.homeId,
      nodeId: parsedTopic.nodeId,
      payload: ok.data,
    });
    if (!res.ok) log("warn", "Availability persist failed", { nodeId: parsedTopic.nodeId, status: res.status });
    return;
  }

  const { homeId, deviceId, channel } = parsedTopic;

  if (channel === "telemetry") {
    const ok = telemetryPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("warn", "Telemetry rejected", { deviceId, reason: "schema" });
      return;
    }
    if (Object.keys(ok.data.metrics).some((k) => k.endsWith("_delta"))) {
      log("warn", "Telemetry rejected", { deviceId, reason: "client_delta" });
      return;
    }
    const res = await apiPost("/internal/telemetry", {
      homeId,
      deviceId,
      source: "telemetry",
      payload: ok.data,
    });
    if (!res.ok) log("warn", "Telemetry persist failed", { deviceId, status: res.status });
    return;
  }

  if (channel === "state") {
    const ok = statePayloadSchema.safeParse(json);
    if (!ok.success) {
      log("warn", "State rejected", { deviceId, reason: "schema" });
      return;
    }
    if (Object.keys(ok.data.metrics).some((k) => k.endsWith("_delta"))) {
      log("warn", "State rejected", { deviceId, reason: "client_delta" });
      return;
    }
    const res = await apiPost("/internal/telemetry", {
      homeId,
      deviceId,
      source: "state",
      payload: ok.data,
    });
    if (!res.ok) log("warn", "State persist failed", { deviceId, status: res.status });
    return;
  }

  if (channel === "event") {
    const ok = eventPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("warn", "Event rejected", { deviceId, reason: "schema" });
      return;
    }
    const res = await apiPost("/internal/event", { homeId, deviceId, payload: ok.data });
    if (!res.ok) log("warn", "Event persist failed", { deviceId, status: res.status });
    return;
  }

  if (channel === "ack") {
    const ok = ackPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("warn", "ACK rejected", { deviceId, reason: "schema" });
      return;
    }
    await apiPost("/internal/ack", ok.data);
    return;
  }

  if (channel === "command") {
    log("warn", "Inbound command ignored", { deviceId, topic });
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
  const topic = mqttTopic(target.homeId, target.deviceId, "command");
  await new Promise<void>((resolve, reject) => {
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  await apiPost(`/internal/commands/${target.id}/sent`, {});
  log("info", "Command sent", { commandId: target.id, topic });
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
log("info", "Gateway HTTP listening", { port: PORT });

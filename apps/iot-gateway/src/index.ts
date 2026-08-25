import mqtt from "mqtt";
import Fastify from "fastify";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  MQTT_WILDCARD_ACK,
  MQTT_WILDCARD_COMMAND,
  MQTT_WILDCARD_EVENT,
  MQTT_WILDCARD_NODE_AVAILABILITY,
  MQTT_WILDCARD_STATE,
  MQTT_WILDCARD_TELEMETRY,
  mqttTopic,
  nodeAvailabilityTopic,
  commandPayloadSchema,
} from "@satu-atap/shared";
import {
  API_URL,
  EDGE_DB_PATH,
  HOME_ID,
  INTERNAL_API_KEY,
  MQTT_PASSWORD,
  MQTT_URL,
  MQTT_USERNAME,
  PORT,
  isMqttAuthRejection,
  log,
} from "./config.js";
import { openEdgeDb } from "./db.js";
import { ingestMqttMessage, type MqttPublisher } from "./ingest.js";
import { schedulerTick } from "./edge-automation.js";
import { drainOutbox, probeCloud, syncRules } from "./sync.js";
import { registerLocalApi } from "./local-api.js";

export async function startGateway(opts?: { dbPath?: string; listen?: boolean }) {
  const db = openEdgeDb(opts?.dbPath ?? EDGE_DB_PATH);
  let mqttReady = false;
  let mqttAuthRejected = false;
  let cloudReady = false;

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

  const publish: MqttPublisher = (topic, payload, pubOpts) => {
    client.publish(topic, payload, { qos: pubOpts?.qos ?? 1, retain: pubOpts?.retain ?? false });
  };

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

  client.on("message", (topic, payload) => {
    ingestMqttMessage(db, topic, payload, publish);
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
    await fetch(`${API_URL}/internal/commands/${target.id}/sent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-key": INTERNAL_API_KEY,
      },
      body: "{}",
    });
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
      // Cloud may be unreachable; local automation still runs.
    }
  }

  const http = Fastify({ logger: false });

  http.get("/health", async () => ({
    status: mqttReady ? "healthy" : "degraded",
    mqtt: mqttReady ? "up" : "down",
    sqlite: "up",
    cloud: cloudReady ? "up" : "down",
    backlog: 0,
  }));

  http.post("/internal/publish-command", async (req, reply) => {
    const key = req.headers["x-internal-key"];
    if (key !== INTERNAL_API_KEY) return reply.code(401).send({ error: "Unauthorized" });
    const { commandId } = req.body as { commandId: string };
    await publishCommand(commandId);
    return { success: true };
  });

  registerLocalApi(http, db, {
    mqttReady: () => mqttReady,
    cloudReady: () => cloudReady,
    publish,
  });

  setInterval(() => {
    pollPending().catch(() => undefined);
  }, 2000);

  const syncOnce = async () => {
    cloudReady = await probeCloud(API_URL);
    await drainOutbox(db, { apiUrl: API_URL, internalKey: INTERNAL_API_KEY });
    if (cloudReady) {
      await syncRules(db, { apiUrl: API_URL, internalKey: INTERNAL_API_KEY });
    }
  };

  setInterval(() => {
    drainOutbox(db, { apiUrl: API_URL, internalKey: INTERNAL_API_KEY }).catch(() => undefined);
    probeCloud(API_URL).then((ok) => {
      cloudReady = ok;
    }).catch(() => {
      cloudReady = false;
    });
  }, 3000);

  setInterval(() => {
    syncRules(db, { apiUrl: API_URL, internalKey: INTERNAL_API_KEY }).catch(() => undefined);
  }, 30_000);

  const align = 60_000 - (Date.now() % 60_000);
  setTimeout(() => {
    schedulerTick(db, HOME_ID, publish);
    setInterval(() => schedulerTick(db, HOME_ID, publish), 60_000);
  }, align);

  void syncOnce();

  if (opts?.listen !== false) {
    await http.listen({ port: PORT, host: "0.0.0.0" });
    log("info", "Gateway HTTP listening", { port: PORT });
  }

  return { db, http, client };
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  await startGateway();
}

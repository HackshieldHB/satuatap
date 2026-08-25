import type { FastifyInstance } from "fastify";
import {
  commandPayloadSchema,
  mqttTopic,
} from "@satu-atap/shared";
import { createHash } from "node:crypto";
import type { EdgeDb } from "./db.js";
import { EDGE_LOCAL_TOKEN } from "./config.js";
import {
  backlogDepth,
  enqueueOutbox,
  lastSyncedAt,
  listDeviceState,
} from "./store.js";
import type { MqttPublisher } from "./ingest.js";

function formatValue(metrics: Record<string, unknown>): string | undefined {
  if (typeof metrics.energy_kwh === "number") return `${metrics.energy_kwh.toFixed(2)} kWh`;
  if (typeof metrics.volume_liters === "number") return `${Math.round(metrics.volume_liters)} L`;
  if (typeof metrics.temperature_c === "number") return `${metrics.temperature_c.toFixed(1)}°C`;
  if (typeof metrics.on === "boolean") return metrics.on ? "ON" : "OFF";
  return undefined;
}

export function registerLocalApi(
  http: FastifyInstance,
  db: EdgeDb,
  opts: {
    mqttReady: () => boolean;
    cloudReady: () => boolean;
    publish: MqttPublisher;
  }
) {
  http.addHook("onRequest", async (req, reply) => {
    if (!req.url.startsWith("/local/")) return;
    const token =
      (req.headers["x-edge-token"] as string | undefined) ??
      (typeof req.headers.authorization === "string"
        ? req.headers.authorization.replace(/^Bearer\s+/i, "")
        : undefined);
    if (token !== EDGE_LOCAL_TOKEN) {
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    }
  });

  http.get("/local/health", async () => {
    const backlog = backlogDepth(db);
    const last = lastSyncedAt(db);
    const mqtt = opts.mqttReady();
    const cloud = opts.cloudReady();
    return {
      status: mqtt ? "healthy" : "degraded",
      mqtt: mqtt ? "up" : "down",
      sqlite: "up",
      cloud: cloud ? "up" : "down",
      backlog,
      lastSync: last ? new Date(last).toISOString() : null,
    };
  });

  http.get("/local/homes/:homeId/devices", async (req) => {
    const { homeId } = req.params as { homeId: string };
    const items = listDeviceState(db, homeId).map((d) => {
      const online = Date.now() - d.updatedAt < 60_000;
      return {
        id: d.deviceId,
        homeId: d.homeId,
        roomId: "",
        name: d.deviceId,
        type: "other",
        status: online ? "online" : "offline",
        room: "",
        value: formatValue(d.metrics),
        isOn: typeof d.metrics.on === "boolean" ? d.metrics.on : undefined,
        lastUpdated: new Date(d.updatedAt).toISOString(),
        lastSeen: new Date(d.updatedAt).toISOString(),
        metrics: d.metrics,
      };
    });
    return {
      success: true,
      data: { items, total: items.length, page: 1, pageSize: items.length, hasMore: false },
    };
  });

  http.get("/local/homes/:homeId/dashboard", async (req) => {
    const { homeId } = req.params as { homeId: string };
    const devices = listDeviceState(db, homeId);
    const online = devices.filter((d) => Date.now() - d.updatedAt < 60_000).length;
    const energy = devices.find((d) => typeof d.metrics.energy_kwh === "number");
    const water = devices.find((d) => typeof d.metrics.volume_liters === "number");
    const env = devices.find((d) => typeof d.metrics.temperature_c === "number");
    return {
      success: true,
      data: {
        homeStatus: online === devices.length ? "normal" : "devices_offline",
        statusMessage: "Mode lokal — data dari edge",
        energy: {
          homeId,
          todayKwh: Number(energy?.metrics.energy_kwh ?? 0),
          estimatedCost: 0,
          comparisonPercent: 0,
          comparisonDirection: "down",
          current: energy?.metrics ?? {},
        },
        water: {
          homeId,
          todayLiters: Math.round(Number(water?.metrics.volume_liters ?? 0)),
          estimatedCost: 0,
          comparisonPercent: 0,
          comparisonDirection: "down",
          current: water?.metrics ?? {},
        },
        environment: {
          homeId,
          temperature: Number(env?.metrics.temperature_c ?? 0),
          humidity: Number(env?.metrics.humidity_pct ?? 0),
          airQuality: "good",
        },
        devicesOnline: online,
        devicesOffline: devices.length - online,
        featuredDevices: devices.slice(0, 3).map((d) => ({
          id: d.deviceId,
          homeId,
          name: d.deviceId,
          status: Date.now() - d.updatedAt < 60_000 ? "online" : "offline",
          value: formatValue(d.metrics),
          lastUpdated: new Date(d.updatedAt).toISOString(),
        })),
        recentActivity: [],
      },
    };
  });

  http.post("/local/homes/:homeId/devices/:deviceId/commands", async (req, reply) => {
    const { homeId, deviceId } = req.params as { homeId: string; deviceId: string };
    const body = req.body as { type?: string; params?: Record<string, unknown>; idempotencyKey?: string };
    if (!body.type || !body.idempotencyKey) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    const digest = createHash("sha256").update(`${homeId}:${body.idempotencyKey}`).digest("hex").slice(0, 24);
    const commandId = `edge-${digest}`;
    const payload = commandPayloadSchema.parse({
      commandId,
      type: body.type as "TURN_ON" | "TURN_OFF" | "SET_VALUE" | "SET_BRIGHTNESS",
      params: body.params ?? {},
      idempotencyKey: body.idempotencyKey,
    });
    opts.publish(mqttTopic(homeId, deviceId, "command"), JSON.stringify(payload), { qos: 1 });
    enqueueOutbox(db, "command", {
      id: commandId,
      homeId,
      deviceId,
      type: body.type,
      params: body.params ?? {},
      idempotencyKey: body.idempotencyKey,
      status: "SENT",
      source: "edge",
    });
    return { success: true, data: { id: commandId, status: "SENT" } };
  });
}

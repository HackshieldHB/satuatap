import {
  parseMqttTopic,
  telemetryPayloadSchema,
  statePayloadSchema,
  ackPayloadSchema,
  eventPayloadSchema,
  availabilityPayloadSchema,
} from "@satu-atap/shared";
import type { EdgeDb } from "./db.js";
import { log } from "./config.js";
import {
  enqueueOutbox,
  upsertDeviceState,
  upsertLastMotion,
  type OutboxKind,
} from "./store.js";
import { evaluateEdgeRules } from "./edge-automation.js";
import { evaluateDeviceThresholds } from "./edge-thresholds.js";

export type MqttPublisher = (
  topic: string,
  payload: string,
  opts?: { qos?: 0 | 1 | 2; retain?: boolean }
) => void;

export function ingestMqttMessage(
  db: EdgeDb,
  topic: string,
  raw: Buffer | string,
  publish: MqttPublisher
): boolean {
  const parsedTopic = parseMqttTopic(topic);
  if (!parsedTopic) return false;
  let json: unknown;
  try {
    json = JSON.parse(raw.toString());
  } catch {
    log("warn", "Payload rejected", { reason: "invalid_json", topic });
    return false;
  }

  const now = Date.now();

  if (parsedTopic.kind === "node") {
    if (parsedTopic.nodeId === "gateway") return false;
    const ok = availabilityPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("warn", "Availability rejected", { nodeId: parsedTopic.nodeId, reason: "schema" });
      return false;
    }
    db.transaction(() => {
      enqueueOutbox(
        db,
        "availability",
        { homeId: parsedTopic.homeId, nodeId: parsedTopic.nodeId, payload: ok.data },
        now
      );
    })();
    return true;
  }

  const { homeId, deviceId, channel } = parsedTopic;

  if (channel === "telemetry" || channel === "state") {
    const schema = channel === "state" ? statePayloadSchema : telemetryPayloadSchema;
    const ok = schema.safeParse(json);
    if (!ok.success) {
      log("warn", channel === "state" ? "State rejected" : "Telemetry rejected", {
        deviceId,
        reason: "schema",
      });
      return false;
    }
    if (Object.keys(ok.data.metrics).some((k) => k.endsWith("_delta"))) {
      log("warn", channel === "state" ? "State rejected" : "Telemetry rejected", {
        deviceId,
        reason: "client_delta",
      });
      return false;
    }
    const kind: OutboxKind = channel === "state" ? "state" : "telemetry";
    db.transaction(() => {
      enqueueOutbox(
        db,
        kind,
        { homeId, deviceId, source: channel, payload: ok.data },
        now
      );
      evaluateDeviceThresholds(db, homeId, deviceId, ok.data.metrics as Record<string, unknown>, now);
      upsertDeviceState(db, deviceId, homeId, ok.data.metrics as Record<string, unknown>, now);
    })();
    const metrics = ok.data.metrics as Record<string, unknown>;
    evaluateEdgeRules(
      db,
      homeId,
      {
        type: metrics.motion === true ? "MOTION_DETECTED" : "TELEMETRY",
        deviceId,
        metrics,
      },
      publish
    );
    return true;
  }

  if (channel === "event") {
    const ok = eventPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("warn", "Event rejected", { deviceId, reason: "schema" });
      return false;
    }
    const occurredAt = Date.parse(ok.data.ts) || now;
    db.transaction(() => {
      enqueueOutbox(db, "event", { homeId, deviceId, payload: ok.data }, now);
      if (ok.data.event === "MOTION_DETECTED") {
        upsertLastMotion(db, deviceId, occurredAt);
      }
    })();
    evaluateEdgeRules(
      db,
      homeId,
      { type: ok.data.event, deviceId, metrics: ok.data.data },
      publish
    );
    return true;
  }

  if (channel === "ack") {
    const ok = ackPayloadSchema.safeParse(json);
    if (!ok.success) {
      log("warn", "ACK rejected", { deviceId, reason: "schema" });
      return false;
    }
    db.transaction(() => {
      enqueueOutbox(db, "ack", ok.data, now);
    })();
    return true;
  }

  if (channel === "command") {
    log("warn", "Inbound command ignored", { deviceId, topic });
  }
  return false;
}

import { createHash } from "node:crypto";
import {
  clockInTimeZone,
  commandPayloadSchema,
  evaluateRules,
  mqttTopic,
  type Action,
  type AutomationEvent,
  type AutomationRule,
  type Condition,
  type Trigger,
} from "@satu-atap/shared";
import type { EdgeDb } from "./db.js";
import {
  enqueueOutbox,
  lastMotionMap,
  listRules,
  rememberDedupe,
  seenDedupe,
} from "./store.js";
import type { MqttPublisher } from "./ingest.js";
import { log } from "./config.js";

export function edgeCommandId(homeId: string, dedupeKey: string, action: Action): string {
  const digest = createHash("sha256")
    .update(`${homeId}:${dedupeKey}:${action.deviceId}:${action.type}`)
    .digest("hex")
    .slice(0, 24);
  return `edge-${digest}`;
}

function cachedRules(db: EdgeDb, homeId: string): AutomationRule[] {
  return listRules(db, homeId).map((row) => ({
    id: String(row.id),
    enabled: (row.enabled as boolean | undefined) ?? true,
    trigger: row.trigger as Trigger,
    conditions: (row.conditions as Condition[]) ?? [],
    actions: (row.actions as Action[]) ?? [],
  }));
}

export function evaluateEdgeRules(
  db: EdgeDb,
  homeId: string,
  event: AutomationEvent,
  publish: MqttPublisher,
  at = new Date()
) {
  const clock = clockInTimeZone(at, "Asia/Jakarta");
  const ctx = {
    nowMinutes: clock.nowMinutes,
    timezone: "Asia/Jakarta" as const,
    lastMotionAt: lastMotionMap(db),
    nowMs: at.getTime(),
    weekday: clock.weekday,
  };
  const plan = evaluateRules(cachedRules(db, homeId), event, ctx);
  for (const item of plan) {
    if (seenDedupe(db, item.dedupeKey)) continue;
    rememberDedupe(db, item.dedupeKey);
    const commandIds: string[] = [];
    for (const action of item.actions) {
      const commandId = edgeCommandId(homeId, item.dedupeKey, action);
      const idempotencyKey = `edge:${item.dedupeKey}:${action.deviceId}:${action.type}`;
      const payload = commandPayloadSchema.parse({
        commandId,
        type: action.type as "TURN_ON" | "TURN_OFF" | "SET_VALUE" | "SET_BRIGHTNESS",
        params: action.params ?? {},
        idempotencyKey,
      });
      publish(mqttTopic(homeId, action.deviceId, "command"), JSON.stringify(payload), { qos: 1 });
      enqueueOutbox(db, "command", {
        id: commandId,
        homeId,
        deviceId: action.deviceId,
        type: action.type,
        params: action.params ?? {},
        idempotencyKey,
        status: "SENT",
        source: "edge",
      });
      commandIds.push(commandId);
    }
    enqueueOutbox(db, "automation_execution", {
      ruleId: item.ruleId,
      status: "executed",
      result: { commandIds, dedupeKey: item.dedupeKey },
    });
    log("info", "Edge automation executed", { ruleId: item.ruleId, homeId, commandIds });
  }
}

export function schedulerTick(db: EdgeDb, homeId: string, publish: MqttPublisher, at = new Date()) {
  evaluateEdgeRules(db, homeId, { type: "TIME" }, publish, at);
}

import { randomUUID } from "node:crypto";
import type { EdgeDb } from "./db.js";

export type OutboxKind =
  | "telemetry"
  | "state"
  | "event"
  | "availability"
  | "ack"
  | "automation_execution"
  | "alert"
  | "command";

export type OutboxRow = {
  id: string;
  kind: OutboxKind;
  payload: unknown;
  created_at: number;
  attempts: number;
  next_attempt_at: number;
  synced_at: number | null;
};

export function enqueueOutbox(db: EdgeDb, kind: OutboxKind, payload: unknown, now = Date.now()): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO outbox (id, kind, payload, created_at, attempts, next_attempt_at, synced_at)
     VALUES (?, ?, ?, ?, 0, ?, NULL)`
  ).run(id, kind, JSON.stringify(payload), now, now);
  return id;
}

export function pendingOutbox(db: EdgeDb, now = Date.now(), limit = 500): OutboxRow[] {
  const rows = db
    .prepare(
      `SELECT id, kind, payload, created_at, attempts, next_attempt_at, synced_at
       FROM outbox
       WHERE synced_at IS NULL AND next_attempt_at <= ?
       ORDER BY created_at ASC
       LIMIT ?`
    )
    .all(now, limit) as Array<OutboxRow & { payload: string }>;
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) as unknown }));
}

export function markSynced(db: EdgeDb, id: string, now = Date.now()) {
  db.prepare(`UPDATE outbox SET synced_at = ? WHERE id = ?`).run(now, id);
}

export function markRetry(db: EdgeDb, id: string, attempts: number, nextAttemptAt: number) {
  db.prepare(`UPDATE outbox SET attempts = ?, next_attempt_at = ? WHERE id = ?`).run(
    attempts,
    nextAttemptAt,
    id
  );
}

export function backoffMs(attempts: number): number {
  const base = Math.min(60_000, 1000 * 2 ** Math.max(0, attempts));
  const jitter = Math.floor(Math.random() * Math.min(250, base * 0.2));
  return base + jitter;
}

export function deleteOldSynced(db: EdgeDb, now = Date.now()) {
  const cutoff = now - 7 * 24 * 60 * 60_000;
  db.prepare(`DELETE FROM outbox WHERE synced_at IS NOT NULL AND synced_at < ?`).run(cutoff);
}

export function backlogDepth(db: EdgeDb): number {
  const row = db.prepare(`SELECT COUNT(*) as n FROM outbox WHERE synced_at IS NULL`).get() as {
    n: number;
  };
  return row.n;
}

export function lastSyncedAt(db: EdgeDb): number | null {
  const row = db
    .prepare(`SELECT MAX(synced_at) as t FROM outbox WHERE synced_at IS NOT NULL`)
    .get() as { t: number | null };
  return row.t;
}

export function upsertDeviceState(
  db: EdgeDb,
  deviceId: string,
  homeId: string,
  metrics: Record<string, unknown>,
  now = Date.now()
) {
  const existing = db.prepare(`SELECT metrics FROM device_state WHERE device_id = ?`).get(deviceId) as
    | { metrics: string }
    | undefined;
  const prev = existing ? (JSON.parse(existing.metrics) as Record<string, unknown>) : {};
  const merged = { ...prev, ...metrics };
  db.prepare(
    `INSERT INTO device_state (device_id, home_id, metrics, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET metrics = excluded.metrics, updated_at = excluded.updated_at, home_id = excluded.home_id`
  ).run(deviceId, homeId, JSON.stringify(merged), now);
}

export function listDeviceState(db: EdgeDb, homeId: string) {
  return (
    db
      .prepare(`SELECT device_id, home_id, metrics, updated_at FROM device_state WHERE home_id = ?`)
      .all(homeId) as Array<{ device_id: string; home_id: string; metrics: string; updated_at: number }>
  ).map((r) => ({
    deviceId: r.device_id,
    homeId: r.home_id,
    metrics: JSON.parse(r.metrics) as Record<string, unknown>,
    updatedAt: r.updated_at,
  }));
}

export function upsertLastMotion(db: EdgeDb, deviceId: string, occurredAt: number) {
  db.prepare(
    `INSERT INTO last_motion (device_id, occurred_at) VALUES (?, ?)
     ON CONFLICT(device_id) DO UPDATE SET occurred_at = excluded.occurred_at`
  ).run(deviceId, occurredAt);
}

export function lastMotionMap(db: EdgeDb): Record<string, number> {
  const rows = db.prepare(`SELECT device_id, occurred_at FROM last_motion`).all() as Array<{
    device_id: string;
    occurred_at: number;
  }>;
  const map: Record<string, number> = {};
  for (const r of rows) map[r.device_id] = r.occurred_at;
  return map;
}

export function upsertRule(db: EdgeDb, ruleId: string, homeId: string, payload: unknown, updatedAt: number) {
  db.prepare(
    `INSERT INTO rule_cache (rule_id, home_id, payload, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(rule_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at, home_id = excluded.home_id`
  ).run(ruleId, homeId, JSON.stringify(payload), updatedAt);
}

export function listRules(db: EdgeDb, homeId?: string) {
  const rows = (
    homeId
      ? db.prepare(`SELECT rule_id, home_id, payload, updated_at FROM rule_cache WHERE home_id = ?`).all(homeId)
      : db.prepare(`SELECT rule_id, home_id, payload, updated_at FROM rule_cache`).all()
  ) as Array<{ rule_id: string; home_id: string; payload: string; updated_at: number }>;
  return rows.map((r) => ({
    id: r.rule_id,
    homeId: r.home_id,
    ...(JSON.parse(r.payload) as Record<string, unknown>),
  }));
}

export function getMeta(db: EdgeDb, key: string): string | null {
  const row = db.prepare(`SELECT value FROM meta WHERE key = ?`).get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(db: EdgeDb, key: string, value: string) {
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

export function seenDedupe(db: EdgeDb, key: string): boolean {
  return getMeta(db, `dedupe:${key}`) != null;
}

export function rememberDedupe(db: EdgeDb, key: string) {
  setMeta(db, `dedupe:${key}`, "1");
}

import { createHash } from "node:crypto";
import type { EdgeDb } from "./db.js";
import { enqueueOutbox, listDeviceState } from "./store.js";
import {
  abnormalWater,
  evaluateHysteresis,
  type Threshold,
  type ThresholdState,
} from "./thresholds.js";
import { log } from "./config.js";

function jakartaDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export function upsertThresholdCache(db: EdgeDb, id: string, homeId: string, payload: unknown, updatedAt: number) {
  db.prepare(
    `INSERT INTO threshold_cache (threshold_id, home_id, payload, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(threshold_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at, home_id = excluded.home_id`
  ).run(id, homeId, JSON.stringify(payload), updatedAt);
}

export function listThresholds(db: EdgeDb, homeId: string): Threshold[] {
  const rows = db
    .prepare(`SELECT payload FROM threshold_cache WHERE home_id = ?`)
    .all(homeId) as Array<{ payload: string }>;
  return rows
    .map((r) => JSON.parse(r.payload) as Threshold)
    .filter((t) => t.enabled !== false);
}

function stateKey(t: Threshold, deviceId: string): string {
  return `${t.homeId}:${t.type}:${t.metric}:${deviceId}`;
}

function loadState(db: EdgeDb, key: string): ThresholdState & { alertId: string | null } {
  const row = db.prepare(`SELECT open, breached_since, ok_since, alert_id FROM threshold_state WHERE key = ?`).get(key) as
    | { open: number; breached_since: number | null; ok_since: number | null; alert_id: string | null }
    | undefined;
  return {
    open: Boolean(row?.open),
    breachedSince: row?.breached_since ?? null,
    okSince: row?.ok_since ?? null,
    alertId: row?.alert_id ?? null,
  };
}

function saveState(
  db: EdgeDb,
  key: string,
  state: ThresholdState,
  alertId: string | null
) {
  db.prepare(
    `INSERT INTO threshold_state (key, open, breached_since, ok_since, alert_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET open = excluded.open, breached_since = excluded.breached_since, ok_since = excluded.ok_since, alert_id = excluded.alert_id`
  ).run(key, state.open ? 1 : 0, state.breachedSince, state.okSince, alertId);
}

function alertIdFor(key: string): string {
  return `edge-alert-${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

function applyResult(
  db: EdgeDb,
  t: Threshold,
  deviceId: string,
  result: { fire: boolean; resolve: boolean; state: ThresholdState },
  message: string
) {
  const key = stateKey(t, deviceId);
  let id = loadState(db, key).alertId;
  if (result.fire) {
    id = alertIdFor(key);
    enqueueOutbox(db, "alert", {
      id,
      homeId: t.homeId,
      deviceId,
      severity: t.severity,
      type: t.type,
      title: t.type,
      message,
      status: "open",
    });
    log("info", "Edge alert fired", { type: t.type, deviceId });
  }
  if (result.resolve && id) {
    enqueueOutbox(db, "alert", {
      id,
      homeId: t.homeId,
      deviceId,
      severity: t.severity,
      type: t.type,
      title: t.type,
      message,
      status: "resolved",
    });
  }
  saveState(db, key, result.state, id);
}

export function recordDailyVolume(db: EdgeDb, deviceId: string, litersDelta: number, now: number) {
  if (litersDelta <= 0) return;
  const day = jakartaDay(now);
  db.prepare(
    `INSERT INTO daily_volume (device_id, day, liters) VALUES (?, ?, ?)
     ON CONFLICT(device_id, day) DO UPDATE SET liters = liters + excluded.liters`
  ).run(deviceId, day, litersDelta);
}

function trailingVolume(db: EdgeDb, deviceId: string, now: number): number[] {
  const today = jakartaDay(now);
  const rows = db
    .prepare(`SELECT day, liters FROM daily_volume WHERE device_id = ? AND day < ? ORDER BY day DESC LIMIT 7`)
    .all(deviceId, today) as Array<{ day: string; liters: number }>;
  return rows.map((r) => r.liters);
}

export function evaluateDeviceThresholds(
  db: EdgeDb,
  homeId: string,
  deviceId: string,
  metrics: Record<string, unknown>,
  now = Date.now()
) {
  const prev = db.prepare(`SELECT metrics FROM device_state WHERE device_id = ?`).get(deviceId) as
    | { metrics: string }
    | undefined;
  const prevMetrics = prev ? (JSON.parse(prev.metrics) as Record<string, unknown>) : {};
  if (typeof metrics.volume_liters === "number") {
    const prevVol = typeof prevMetrics.volume_liters === "number" ? prevMetrics.volume_liters : null;
    const delta = prevVol == null ? 0 : Math.max(0, metrics.volume_liters - prevVol);
    recordDailyVolume(db, deviceId, delta, now);
  }

  for (const t of listThresholds(db, homeId)) {
    if (t.type === "ABNORMAL_WATER") {
      const todayRow = db
        .prepare(`SELECT liters FROM daily_volume WHERE device_id = ? AND day = ?`)
        .get(deviceId, jakartaDay(now)) as { liters: number } | undefined;
      const today = todayRow?.liters ?? 0;
      const trailing = trailingVolume(db, deviceId, now);
      const key = stateKey(t, deviceId);
      const prevState = loadState(db, key);
      const over = abnormalWater(today, trailing, t.value);
      let fire = false;
      let resolve = false;
      const next: ThresholdState = { ...prevState };
      if (over && !prevState.open) {
        next.open = true;
        fire = true;
      } else if (!over && prevState.open) {
        next.open = false;
        resolve = true;
      }
      applyResult(db, t, deviceId, { fire, resolve, state: next }, `Konsumsi air harian ${today.toFixed(0)} L di atas median 7 hari`);
      continue;
    }
    if (t.type === "DEVICE_OFFLINE") continue;
    const raw = metrics[t.metric];
    if (typeof raw !== "number") continue;
    const key = stateKey(t, deviceId);
    const result = evaluateHysteresis(t, raw, loadState(db, key), now);
    applyResult(db, t, deviceId, result, `${t.metric}=${raw} (${t.op} ${t.value})`);
  }
}

export function evaluateOfflineThresholds(db: EdgeDb, homeId: string, now = Date.now()) {
  const thresholds = listThresholds(db, homeId).filter((t) => t.type === "DEVICE_OFFLINE");
  if (thresholds.length === 0) return;
  for (const device of listDeviceState(db, homeId)) {
    const ageS = (now - device.updatedAt) / 1000;
    for (const t of thresholds) {
      const result = evaluateHysteresis(t, ageS, loadState(db, stateKey(t, device.deviceId)), now);
      applyResult(db, t, device.deviceId, result, `Perangkat ${device.deviceId} tidak terlihat ${Math.round(ageS)}s`);
    }
  }
}

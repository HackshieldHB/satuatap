import Database from "better-sqlite3";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS outbox_sync_idx ON outbox (synced_at, next_attempt_at);

CREATE TABLE IF NOT EXISTS rule_cache (
  rule_id TEXT PRIMARY KEY,
  home_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS device_state (
  device_id TEXT PRIMARY KEY,
  home_id TEXT NOT NULL,
  metrics TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS last_motion (
  device_id TEXT PRIMARY KEY,
  occurred_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS threshold_cache (
  threshold_id TEXT PRIMARY KEY,
  home_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS threshold_state (
  key TEXT PRIMARY KEY,
  open INTEGER NOT NULL DEFAULT 0,
  breached_since INTEGER,
  ok_since INTEGER,
  alert_id TEXT
);

CREATE TABLE IF NOT EXISTS daily_volume (
  device_id TEXT NOT NULL,
  day TEXT NOT NULL,
  liters REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, day)
);
`;

export type EdgeDb = Database.Database;

export function openEdgeDb(path: string): EdgeDb {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(SCHEMA);
  return db;
}

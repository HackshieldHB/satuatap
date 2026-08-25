import type { EdgeDb } from "./db.js";
import { log } from "./config.js";
import {
  backoffMs,
  deleteOldSynced,
  markRetry,
  markSynced,
  pendingOutbox,
  setMeta,
  upsertRule,
  type OutboxKind,
  type OutboxRow,
} from "./store.js";

export type CloudFetch = typeof fetch;

async function postJson(
  fetchFn: CloudFetch,
  url: string,
  key: string,
  body: unknown
): Promise<{ status: number; ok: boolean }> {
  const res = await fetchFn(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  return { status: res.status, ok: res.ok };
}

function endpointFor(kind: OutboxKind, apiUrl: string): string | null {
  switch (kind) {
    case "telemetry":
    case "state":
      return `${apiUrl}/internal/telemetry/batch`;
    case "event":
      return `${apiUrl}/internal/events/batch`;
    case "command":
      return `${apiUrl}/internal/commands/reconcile`;
    case "availability":
      return `${apiUrl}/internal/availability`;
    case "ack":
      return `${apiUrl}/internal/ack`;
    case "alert":
      return `${apiUrl}/internal/alerts`;
    case "automation_execution":
      return `${apiUrl}/internal/automation-executions`;
    default:
      return null;
  }
}

function bodyFor(kind: OutboxKind, rows: OutboxRow[]): unknown {
  if (kind === "telemetry" || kind === "state") {
    return { items: rows.map((r) => r.payload) };
  }
  if (kind === "event") return { items: rows.map((r) => r.payload) };
  if (kind === "command") return { items: rows.map((r) => r.payload) };
  if (kind === "alert") return { items: rows.map((r) => r.payload) };
  if (kind === "automation_execution") return { items: rows.map((r) => r.payload) };
  return rows[0]?.payload;
}

async function syncRowGroup(
  db: EdgeDb,
  fetchFn: CloudFetch,
  apiUrl: string,
  key: string,
  kind: OutboxKind,
  rows: OutboxRow[],
  now: number
) {
  const url = endpointFor(kind, apiUrl);
  if (!url) {
    for (const row of rows) markSynced(db, row.id, now);
    return;
  }
  const batched = ["telemetry", "state", "event", "command", "alert", "automation_execution"].includes(
    kind
  );
  try {
    if (batched) {
      const res = await postJson(fetchFn, url, key, bodyFor(kind, rows));
      if (res.ok) {
        for (const row of rows) markSynced(db, row.id, now);
        return;
      }
      if (res.status >= 400 && res.status < 500) {
        if (rows.length === 1) {
          log("error", "Outbox row rejected", { id: rows[0].id, kind, payload: rows[0].payload });
          markSynced(db, rows[0].id, now);
          return;
        }
        for (const row of rows) {
          await syncRowGroup(db, fetchFn, apiUrl, key, kind, [row], now);
        }
        return;
      }
      for (const row of rows) {
        markRetry(db, row.id, row.attempts + 1, now + backoffMs(row.attempts + 1));
      }
      return;
    }
    for (const row of rows) {
      const res = await postJson(fetchFn, url, key, row.payload);
      if (res.ok) {
        markSynced(db, row.id, now);
      } else if (res.status >= 400 && res.status < 500) {
        log("error", "Outbox row rejected", { id: row.id, kind, payload: row.payload });
        markSynced(db, row.id, now);
      } else {
        markRetry(db, row.id, row.attempts + 1, now + backoffMs(row.attempts + 1));
      }
    }
  } catch {
    for (const row of rows) {
      markRetry(db, row.id, row.attempts + 1, now + backoffMs(row.attempts + 1));
    }
  }
}

export async function drainOutbox(
  db: EdgeDb,
  opts: { apiUrl: string; internalKey: string; fetchFn?: CloudFetch; now?: number }
): Promise<{ synced: number; retried: number }> {
  const now = opts.now ?? Date.now();
  const fetchFn = opts.fetchFn ?? fetch;
  const rows = pendingOutbox(db, now, 500);
  const groups = new Map<OutboxKind, OutboxRow[]>();
  for (const row of rows) {
    const list = groups.get(row.kind) ?? [];
    list.push(row);
    groups.set(row.kind, list);
  }
  for (const [kind, group] of groups) {
    await syncRowGroup(db, fetchFn, opts.apiUrl, opts.internalKey, kind, group, now);
  }
  deleteOldSynced(db, now);
  const leftover = pendingOutbox(db, now, 500).length;
  return { synced: rows.length - leftover, retried: leftover };
}

export async function syncRules(
  db: EdgeDb,
  opts: { apiUrl: string; internalKey: string; fetchFn?: CloudFetch }
): Promise<boolean> {
  const fetchFn = opts.fetchFn ?? fetch;
  const since = db.prepare(`SELECT value FROM meta WHERE key = ?`).get("rule_cursor") as
    | { value: string }
    | undefined;
  const cursor = since?.value ?? "";
  const url = `${opts.apiUrl}/internal/automations?since=${encodeURIComponent(cursor)}`;
  try {
    const res = await fetchFn(url, {
      headers: { "x-internal-key": opts.internalKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      log("warn", "Rule sync failed", { status: res.status });
      return false;
    }
    const body = (await res.json()) as {
      data: Array<{
        id: string;
        homeId: string;
        updatedAt?: string;
        enabled?: boolean;
        trigger?: unknown;
        conditions?: unknown;
        actions?: unknown;
        name?: string;
      }>;
      cursor?: string;
    };
    const rules = body.data ?? [];
    for (const rule of rules) {
      const updatedAt = rule.updatedAt ? Date.parse(rule.updatedAt) : Date.now();
      upsertRule(db, rule.id, rule.homeId, rule, updatedAt);
    }
    if (body.cursor) setMeta(db, "rule_cursor", body.cursor);
    return true;
  } catch (err) {
    log("warn", "Rule sync unreachable", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}

export async function probeCloud(
  apiUrl: string,
  fetchFn: CloudFetch = fetch
): Promise<boolean> {
  try {
    const res = await fetchFn(`${apiUrl}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

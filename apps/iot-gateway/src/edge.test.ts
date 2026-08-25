import { describe, expect, it } from "vitest";
import { mqttTopic } from "@satu-atap/shared";
import { openEdgeDb } from "./db.js";
import { ingestMqttMessage } from "./ingest.js";
import { schedulerTick } from "./edge-automation.js";
import { drainOutbox } from "./sync.js";
import {
  backlogDepth,
  enqueueOutbox,
  listRules,
  pendingOutbox,
  upsertRule,
} from "./store.js";

function memoryDb() {
  return openEdgeDb(":memory:");
}

describe("edge outbox", () => {
  it("keeps 100 readings pending while the cloud is down, then syncs each once", async () => {
    const db = memoryDb();
    const posted: unknown[] = [];
    for (let i = 0; i < 100; i++) {
      ingestMqttMessage(
        db,
        mqttTopic("home-1", "energy-main", "telemetry"),
        Buffer.from(
          JSON.stringify({
            ts: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
            metrics: { power: 100 + i, energy_kwh: 4.5 },
          })
        ),
        () => undefined
      );
    }
    expect(backlogDepth(db)).toBe(100);

    const failing = async () => {
      throw new Error("cloud down");
    };
    await drainOutbox(db, {
      apiUrl: "http://cloud.test",
      internalKey: "k",
      fetchFn: failing as unknown as typeof fetch,
    });
    expect(backlogDepth(db)).toBe(100);

    const seen = new Set<string>();
    const okFetch: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        items: Array<{ payload: { ts: string } }>;
      };
      for (const item of body.items ?? []) {
        const ts = item.payload.ts;
        expect(seen.has(ts)).toBe(false);
        seen.add(ts);
        posted.push(item);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };
    const later = Date.now() + 120_000;
    await drainOutbox(db, {
      apiUrl: "http://cloud.test",
      internalKey: "k",
      fetchFn: okFetch,
      now: later,
    });
    expect(backlogDepth(db)).toBe(0);
    expect(posted).toHaveLength(100);
    expect(seen.size).toBe(100);
  });

  it("fires automation from rule_cache while the cloud is unreachable", () => {
    const db = memoryDb();
    const published: string[] = [];
    upsertRule(
      db,
      "auto-living-motion-light",
      "home-1",
      {
        id: "auto-living-motion-light",
        enabled: true,
        trigger: { type: "MOTION_DETECTED", deviceId: "pir-living-room" },
        conditions: [],
        actions: [{ type: "TURN_ON", deviceId: "light-living-room" }],
      },
      Date.now()
    );
    expect(listRules(db, "home-1")).toHaveLength(1);
    ingestMqttMessage(
      db,
      mqttTopic("home-1", "pir-living-room", "event"),
      Buffer.from(
        JSON.stringify({ ts: new Date().toISOString(), event: "MOTION_DETECTED" })
      ),
      (topic) => {
        published.push(topic);
      }
    );
    expect(published.some((t) => t.endsWith("/command"))).toBe(true);
    expect(pendingOutbox(db).some((r) => r.kind === "command")).toBe(true);
  });

  it("does not let a failing row block later rows indefinitely", async () => {
    const db = memoryDb();
    enqueueOutbox(db, "ack", { commandId: "bad", status: "SUCCEEDED" });
    enqueueOutbox(db, "ack", { commandId: "good", status: "SUCCEEDED" });
    const okFetch: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { commandId?: string };
      if (body.commandId === "bad") {
        return new Response("no", { status: 500 });
      }
      return new Response("{}", { status: 200 });
    };
    await drainOutbox(db, { apiUrl: "http://cloud.test", internalKey: "k", fetchFn: okFetch });
    const pending = pendingOutbox(db, Date.now() + 60_000);
    expect(pending).toHaveLength(1);
    expect((pending[0].payload as { commandId: string }).commandId).toBe("bad");
  });

  it("TIME scheduler evaluates cached rules", () => {
    const db = memoryDb();
    const published: string[] = [];
    upsertRule(
      db,
      "auto-time",
      "home-1",
      {
        id: "auto-time",
        enabled: true,
        trigger: { type: "TIME", at: "18:30" },
        conditions: [],
        actions: [{ type: "TURN_ON", deviceId: "light-kitchen" }],
      },
      Date.now()
    );
    const at = new Date(Date.UTC(2026, 0, 15, 11, 30, 0));
    schedulerTick(db, "home-1", (topic) => published.push(topic), at);
    expect(published.some((t) => t.includes("light-kitchen"))).toBe(true);
  });
});

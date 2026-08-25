import type { ApiResponse, SystemHealth, SystemComponentStatus, Device } from "@/types";
import { MOCK_SYSTEM_HEALTH, MOCK_DEVICES } from "@/data/mock";
import { apiBaseUrl, edgeBaseUrl, useMockData } from "@/lib/config";
import { isLocalMode } from "@/lib/local-mode";
import { delay } from "@/lib/utils";
import { deviceService } from "@/services/home.service";

function asStatus(v: unknown, fallback: SystemComponentStatus = "unknown"): SystemComponentStatus {
  if (v === "up" || v === "healthy") return "up";
  if (v === "down" || v === "unhealthy") return "down";
  if (v === "degraded") return "degraded";
  return fallback;
}

async function probe(url: string): Promise<{ ok: boolean; json?: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, json };
  } catch {
    return { ok: false };
  }
}

function nodesFromDevices(devices: Device[]) {
  const map = new Map<string, Device[]>();
  for (const d of devices) {
    const id = d.nodeId || "tanpa-node";
    const list = map.get(id) ?? [];
    list.push(d);
    map.set(id, list);
  }
  return [...map.entries()].map(([nodeId, list]) => {
    const onlineCount = list.filter((d) => d.status === "online").length;
    const lastSeen = list
      .map((d) => d.lastSeen || d.lastUpdated)
      .sort()
      .at(-1);
    return {
      nodeId,
      status: (onlineCount > 0 ? "up" : "down") as SystemComponentStatus,
      lastSeen,
      deviceCount: list.length,
      onlineCount,
    };
  });
}

export class SystemService {
  async getHealth(homeId: string): Promise<ApiResponse<SystemHealth>> {
    if (useMockData) {
      await delay(200);
      return { success: true, data: { ...MOCK_SYSTEM_HEALTH, localMode: isLocalMode() } };
    }

    const [edge, cloud, db, mqtt, devicesRes] = await Promise.all([
      probe(`${edgeBaseUrl}/local/health`),
      probe(`${apiBaseUrl}/health`),
      probe(`${apiBaseUrl}/health/db`),
      probe(`${apiBaseUrl}/health/mqtt`),
      deviceService.getDevices(homeId, "all", 1, 100),
    ]);

    const devices = devicesRes.data?.items ?? MOCK_DEVICES.filter((d) => d.homeId === homeId);
    const edgeJson = edge.json ?? {};
    return {
      success: true,
      data: {
        pi: edge.ok ? asStatus(edgeJson.status, "up") : "down",
        mqtt: mqtt.ok
          ? asStatus((mqtt.json?.services as { mqtt?: string } | undefined)?.mqtt ?? edgeJson.mqtt)
          : asStatus(edgeJson.mqtt, "unknown"),
        database: db.ok ? "up" : "down",
        cloud: cloud.ok ? "up" : "down",
        nodes: nodesFromDevices(devices),
        backlog: typeof edgeJson.backlog === "number" ? edgeJson.backlog : 0,
        lastSync: typeof edgeJson.lastSync === "string" ? edgeJson.lastSync : null,
        localMode: isLocalMode(),
      },
    };
  }
}

export const systemService = new SystemService();

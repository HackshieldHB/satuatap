import type { ApiResponse, HomeAlert, AlertThreshold } from "@/types";
import { MOCK_ALERTS, MOCK_ALERT_THRESHOLDS, MOCK_DEVICES, MOCK_ROOMS } from "@/data/mock";
import { useMockData } from "@/lib/config";
import { apiFetch } from "@/services/http";
import { delay } from "@/lib/utils";

function annotate(alerts: HomeAlert[]): HomeAlert[] {
  return alerts.map((a) => ({
    ...a,
    createdAt: typeof a.createdAt === "string" ? a.createdAt : new Date(a.createdAt).toISOString(),
    acknowledgedAt: a.acknowledgedAt
      ? typeof a.acknowledgedAt === "string"
        ? a.acknowledgedAt
        : new Date(a.acknowledgedAt).toISOString()
      : a.acknowledgedAt,
    deviceName: a.deviceName ?? MOCK_DEVICES.find((d) => d.id === a.deviceId)?.name,
    roomName: a.roomName ?? MOCK_ROOMS.find((r) => r.id === a.roomId)?.name,
  }));
}

export class AlertService {
  async getAlerts(homeId: string): Promise<ApiResponse<HomeAlert[]>> {
    if (!useMockData) {
      const res = await apiFetch<HomeAlert[]>(`/v1/homes/${homeId}/alerts`);
      if (!res.success || !res.data) return res;
      return { ...res, data: annotate(res.data) };
    }
    await delay(200);
    return {
      success: true,
      data: annotate(MOCK_ALERTS.filter((a) => a.homeId === homeId).map((a) => ({ ...a }))),
    };
  }

  async ackAlert(homeId: string, alertId: string): Promise<ApiResponse<HomeAlert>> {
    if (!useMockData) {
      return apiFetch<HomeAlert>(`/v1/homes/${homeId}/alerts/${alertId}/ack`, { method: "POST" });
    }
    await delay(250);
    const row = MOCK_ALERTS.find((a) => a.id === alertId);
    if (!row) return { success: false, error: "Peringatan tidak ditemukan." };
    row.status = "acknowledged";
    row.acknowledgedAt = new Date().toISOString();
    return { success: true, data: { ...row } };
  }

  async getThresholds(homeId: string): Promise<ApiResponse<AlertThreshold[]>> {
    if (!useMockData) {
      return apiFetch<AlertThreshold[]>(`/v1/homes/${homeId}/alert-thresholds`);
    }
    await delay(150);
    return { success: true, data: MOCK_ALERT_THRESHOLDS.filter((t) => t.homeId === homeId).map((t) => ({ ...t })) };
  }

  async updateThreshold(
    homeId: string,
    id: string,
    patch: Partial<Pick<AlertThreshold, "value" | "enabled" | "forSeconds" | "op">>
  ): Promise<ApiResponse<AlertThreshold>> {
    if (!useMockData) {
      return apiFetch<AlertThreshold>(`/v1/homes/${homeId}/alert-thresholds/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    }
    await delay(200);
    const row = MOCK_ALERT_THRESHOLDS.find((t) => t.id === id);
    if (!row) return { success: false, error: "Ambang tidak ditemukan." };
    Object.assign(row, patch);
    return { success: true, data: { ...row } };
  }
}

export const alertService = new AlertService();

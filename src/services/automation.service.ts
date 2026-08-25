import type { ApiResponse, AutomationRule } from "@/types";
import { MOCK_DEVICES, MOCK_AUTOMATIONS, SCENES } from "@/data/mock";
import { delay } from "@/lib/utils";
import { useMockData } from "@/lib/config";
import { apiFetch } from "@/services/http";

type ApiRule = {
  id: string;
  name: string;
  enabled: boolean;
  icon?: string | null;
  trigger: { type: string; deviceId?: string };
  actions: Array<{ type: string; deviceId: string }>;
};

function mapRule(r: ApiRule): AutomationRule {
  return {
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    icon: r.icon ?? "bot",
    triggerType: r.trigger.type === "MOTION_DETECTED" ? "motion" : "time",
    triggerLabel: r.trigger.type,
    actionLabels: r.actions.map((a) => `${a.type} ${a.deviceId}`),
  };
}

export class AutomationService {
  async list(homeId: string): Promise<ApiResponse<AutomationRule[]>> {
    if (!useMockData) {
      const res = await apiFetch<ApiRule[]>(`/v1/homes/${homeId}/automations`);
      if (!res.success || !res.data) return { success: false, error: res.error };
      return { success: true, data: res.data.map(mapRule) };
    }
    return { success: true, data: MOCK_AUTOMATIONS.map((r) => ({ ...r })) };
  }

  async setEnabled(
    homeId: string,
    id: string,
    enabled: boolean
  ): Promise<ApiResponse<{ enabled: boolean }>> {
    if (!useMockData) {
      const res = await apiFetch<ApiRule>(`/v1/homes/${homeId}/automations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      return {
        success: res.success,
        data: res.data ? { enabled: res.data.enabled } : undefined,
        error: res.error,
      };
    }
    return { success: true, data: { enabled } };
  }

  async remove(homeId: string, id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    if (!useMockData) {
      return apiFetch(`/v1/homes/${homeId}/automations/${id}`, { method: "DELETE" });
    }
    return { success: true, data: { deleted: true } };
  }

  async createUiRule(
    homeId: string,
    rule: AutomationRule
  ): Promise<ApiResponse<AutomationRule>> {
    if (!useMockData) {
      const res = await apiFetch<ApiRule>(`/v1/homes/${homeId}/automations`, {
        method: "POST",
        body: JSON.stringify({
          name: rule.name,
          enabled: true,
          icon: rule.icon,
          trigger:
            rule.triggerType === "motion"
              ? { type: "MOTION_DETECTED", deviceId: "pir-living-room" }
              : { type: "TIME" },
          conditions: [{ type: "TIME_RANGE", from: "00:00", to: "23:59" }],
          actions: [{ type: "TURN_ON", deviceId: "light-living-room" }],
        }),
      });
      if (!res.success || !res.data) return { success: false, error: res.error };
      return { success: true, data: mapRule(res.data) };
    }
    return { success: true, data: rule };
  }

  async activateScene(
    id: string
  ): Promise<ApiResponse<{ updated: number; name: string }>> {
    await delay(700);
    const scene = SCENES.find((s) => s.id === id);
    if (!scene) return { success: false, error: "Skenario tidak ditemukan." };

    let updated = 0;
    for (const action of scene.actions) {
      const device = MOCK_DEVICES.find((d) => d.id === action.deviceId);
      if (device && device.isOn !== undefined) {
        device.isOn = action.turnOn;
        device.value = action.turnOn ? "ON" : "OFF";
        updated++;
      }
    }
    return { success: true, data: { updated, name: scene.name } };
  }
}

export const automationService = new AutomationService();

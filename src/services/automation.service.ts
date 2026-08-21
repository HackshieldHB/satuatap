import type { ApiResponse } from "@/types";
import { MOCK_DEVICES, SCENES } from "@/data/mock";
import { delay } from "@/lib/utils";

export class AutomationService {
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

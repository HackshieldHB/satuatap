import type { ApiResponse, EnergyUsage, WaterUsage, EnvironmentData } from "@/types";
import { ENERGY_HISTORY, WATER_HISTORY, MOCK_DASHBOARD } from "@/data/mock";
import { useMockData } from "@/lib/config";
import { apiFetch } from "@/services/http";
import { delay } from "@/lib/utils";

export type EnergyDetail = EnergyUsage & {
  history: { label: string; value: number }[];
  current?: Record<string, number | undefined>;
  tariffPerKwh?: number;
};

export type WaterDetail = WaterUsage & {
  history: { label: string; value: number }[];
  current?: Record<string, number | undefined>;
  tariffPerM3?: number;
};

export class TelemetryService {
  async getEnergy(homeId: string): Promise<ApiResponse<EnergyDetail>> {
    if (!useMockData) return apiFetch<EnergyDetail>(`/v1/homes/${homeId}/energy`);
    await delay(200);
    return {
      success: true,
      data: { ...MOCK_DASHBOARD.energy, homeId, history: ENERGY_HISTORY },
    };
  }

  async getWater(homeId: string): Promise<ApiResponse<WaterDetail>> {
    if (!useMockData) return apiFetch<WaterDetail>(`/v1/homes/${homeId}/water`);
    await delay(200);
    return {
      success: true,
      data: { ...MOCK_DASHBOARD.water, homeId, history: WATER_HISTORY },
    };
  }

  async getEnvironment(homeId: string): Promise<ApiResponse<EnvironmentData>> {
    if (!useMockData) {
      return apiFetch<EnvironmentData>(`/v1/homes/${homeId}/environment`);
    }
    await delay(200);
    return { success: true, data: { ...MOCK_DASHBOARD.environment, homeId } };
  }
}

export const telemetryService = new TelemetryService();

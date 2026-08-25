import type { ApiResponse, EnergyUsage, WaterUsage, EnvironmentData, EnvironmentDetail, TelemetryPoint, UsagePeriod } from "@/types";
import {
  ENERGY_HISTORY,
  ENERGY_HISTORY_MONTH,
  WATER_HISTORY,
  MOCK_DASHBOARD,
  MOCK_ENVIRONMENT_DETAIL,
  MOCK_DEVICES,
  mockDeviceTelemetry,
} from "@/data/mock";
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

function periodFrom(period: UsagePeriod): Date {
  const from = new Date();
  if (period === "month") from.setUTCDate(from.getUTCDate() - 30);
  else if (period === "week") from.setUTCDate(from.getUTCDate() - 7);
  else from.setUTCHours(from.getUTCHours() - 24);
  return from;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function bucketHistory(
  rows: TelemetryPoint[],
  key: string,
  period: UsagePeriod
): { label: string; value: number }[] {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    const v = num(row.metrics[key]);
    if (v === undefined) continue;
    const d = new Date(row.timestamp);
    const label =
      period === "day"
        ? d.toISOString().slice(11, 13) + ":00"
        : d.toISOString().slice(5, 10);
    const list = map.get(label) ?? [];
    list.push(v);
    map.set(label, list);
  }
  return [...map.entries()]
    .reverse()
    .map(([label, vals]) => ({
      label,
      value: Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
    }));
}

function stats(values: number[]) {
  if (values.length === 0) return { min: 0, max: 0, avg: 0 };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  };
}

export class TelemetryService {
  async getEnergy(homeId: string, period: UsagePeriod = "day"): Promise<ApiResponse<EnergyDetail>> {
    if (!useMockData) {
      return apiFetch<EnergyDetail>(`/v1/homes/${homeId}/energy?period=${period}`);
    }
    await delay(200);
    const history = period === "month" ? ENERGY_HISTORY_MONTH : ENERGY_HISTORY;
    const consumption = history.reduce((a, p) => a + p.value, 0);
    return {
      success: true,
      data: {
        ...MOCK_DASHBOARD.energy,
        homeId,
        period,
        consumption: Number(consumption.toFixed(2)),
        estimatedCost: period === "day" ? MOCK_DASHBOARD.energy.estimatedCost : Math.round(consumption * 1500),
        peak: 1850,
        average: 420,
        history,
      },
    };
  }

  async getWater(homeId: string, period: UsagePeriod = "day"): Promise<ApiResponse<WaterDetail>> {
    if (!useMockData) {
      return apiFetch<WaterDetail>(`/v1/homes/${homeId}/water?period=${period}`);
    }
    await delay(200);
    const history = WATER_HISTORY;
    const consumption = history.reduce((a, p) => a + p.value, 0);
    return {
      success: true,
      data: {
        ...MOCK_DASHBOARD.water,
        homeId,
        period,
        consumption,
        estimatedCost: period === "day" ? MOCK_DASHBOARD.water.estimatedCost : Math.round((consumption / 1000) * 12000),
        peak: 12.4,
        average: 3.1,
        history,
      },
    };
  }

  async getEnvironment(homeId: string): Promise<ApiResponse<EnvironmentData>> {
    if (!useMockData) {
      return apiFetch<EnvironmentData>(`/v1/homes/${homeId}/environment`);
    }
    await delay(200);
    return { success: true, data: { ...MOCK_DASHBOARD.environment, homeId } };
  }

  async getDeviceTelemetry(
    homeId: string,
    deviceId: string,
    period: UsagePeriod = "day"
  ): Promise<ApiResponse<TelemetryPoint[]>> {
    if (!useMockData) {
      const from = periodFrom(period).toISOString();
      const q = new URLSearchParams({ from, limit: "500" });
      return apiFetch<TelemetryPoint[]>(`/v1/homes/${homeId}/devices/${deviceId}/telemetry?${q}`);
    }
    await delay(120);
    return { success: true, data: mockDeviceTelemetry(deviceId) };
  }

  async getEnvironmentDetail(
    homeId: string,
    period: UsagePeriod = "day"
  ): Promise<ApiResponse<EnvironmentDetail>> {
    if (useMockData) {
      await delay(200);
      return { success: true, data: { ...MOCK_ENVIRONMENT_DETAIL, homeId } };
    }
    const envIds = ["env-living-room", "env-bedroom"];
    const pirIds = ["pir-living-room", "pir-bedroom"];
    const rooms: EnvironmentDetail["rooms"] = [];
    for (const deviceId of envIds) {
      const res = await this.getDeviceTelemetry(homeId, deviceId, period);
      const rows = res.data ?? [];
      const latest = rows[0];
      const temps = rows.map((r) => num(r.metrics.temperature_c)).filter((v): v is number => v !== undefined);
      const hums = rows.map((r) => num(r.metrics.humidity_pct)).filter((v): v is number => v !== undefined);
      const t = stats(temps);
      rooms.push({
        deviceId,
        room: MOCK_DEVICES.find((d) => d.id === deviceId)?.room ?? deviceId,
        temperature: num(latest?.metrics.temperature_c) ?? t.avg,
        humidity: num(latest?.metrics.humidity_pct) ?? (hums[0] ?? 0),
        min: t.min,
        max: t.max,
        avg: Number(t.avg.toFixed(1)),
        history: bucketHistory(rows, "temperature_c", period),
      });
    }
    const motion: EnvironmentDetail["motion"] = [];
    const dayFrom = new Date(Date.now() - 24 * 3600_000).toISOString();
    for (const deviceId of pirIds) {
      const res = await apiFetch<TelemetryPoint[]>(
        `/v1/homes/${homeId}/devices/${deviceId}/telemetry?from=${dayFrom}&limit=500`
      );
      const rows = res.data ?? [];
      const hours = Array.from({ length: 24 }, () => false);
      let lastDetected: string | null = null;
      for (const row of rows) {
        if (row.metrics.motion === true) {
          hours[new Date(row.timestamp).getHours()] = true;
          if (!lastDetected) lastDetected = row.timestamp;
        }
      }
      motion.push({
        deviceId,
        room: MOCK_DEVICES.find((d) => d.id === deviceId)?.room ?? deviceId,
        lastDetected,
        hours,
      });
    }
    return { success: true, data: { homeId, rooms, motion } };
  }
}

export const telemetryService = new TelemetryService();

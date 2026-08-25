import type {
  Home,
  Room,
  DashboardData,
  Device,
  ApiResponse,
  PaginatedResponse,
  DeviceFilter,
} from "@/types";
import {
  MOCK_HOMES,
  MOCK_ROOMS,
  MOCK_DASHBOARD,
  MOCK_DASHBOARD_HOME2,
  MOCK_DEVICES,
  DEVICE_FILTERS,
} from "@/data/mock";
import { delay } from "@/lib/utils";
import { useMockData } from "@/lib/config";
import { apiFetch } from "@/services/http";

export class HomeService {
  async getHomes(): Promise<ApiResponse<Home[]>> {
    if (!useMockData) return apiFetch<Home[]>("/v1/homes");
    await delay(400);
    return { success: true, data: MOCK_HOMES };
  }

  async getHomeById(id: string): Promise<ApiResponse<Home>> {
    if (!useMockData) return apiFetch<Home>(`/v1/homes/${id}`);
    await delay(300);
    const home = MOCK_HOMES.find((h) => h.id === id);
    if (!home) return { success: false, error: "Rumah tidak ditemukan." };
    return { success: true, data: home };
  }

  async getDashboard(homeId: string): Promise<ApiResponse<DashboardData>> {
    if (!useMockData) return apiFetch<DashboardData>(`/v1/homes/${homeId}/dashboard`);
    await delay(600);
    const data = homeId === "home-2" ? MOCK_DASHBOARD_HOME2 : MOCK_DASHBOARD;
    return { success: true, data };
  }

  async getRooms(homeId: string): Promise<ApiResponse<Room[]>> {
    if (!useMockData) return apiFetch<Room[]>(`/v1/homes/${homeId}/rooms`);
    await delay(400);
    return {
      success: true,
      data: MOCK_ROOMS.filter((r) => r.homeId === homeId),
    };
  }
}

export class DeviceService {
  async getDevices(
    homeId: string,
    filter: string = "all",
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<Device>>> {
    if (!useMockData) {
      const q = new URLSearchParams({
        filter,
        page: String(page),
        pageSize: String(pageSize),
      });
      return apiFetch<PaginatedResponse<Device>>(
        `/v1/homes/${homeId}/devices?${q.toString()}`
      );
    }
    await delay(500);

    let filtered = MOCK_DEVICES.filter((d) => d.homeId === homeId);

    switch (filter) {
      case "online":
        filtered = filtered.filter((d) => d.status === "online");
        break;
      case "offline":
        filtered = filtered.filter((d) => d.status === "offline");
        break;
      case "sensors":
        filtered = filtered.filter((d) =>
          ["temperature_sensor", "humidity_sensor", "motion_sensor"].includes(
            d.type
          )
        );
        break;
      case "lights":
        filtered = filtered.filter((d) => d.type === "light");
        break;
      case "energy":
        filtered = filtered.filter((d) =>
          ["electricity_meter", "smart_plug"].includes(d.type) ||
          d.capabilities?.includes("power")
        );
        break;
      case "water":
        filtered = filtered.filter(
          (d) => d.type === "water_meter" || d.capabilities?.includes("volume")
        );
        break;
    }

    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      success: true,
      data: {
        items,
        total: filtered.length,
        page,
        pageSize,
        hasMore: start + pageSize < filtered.length,
      },
    };
  }

  async getFilters(): Promise<DeviceFilter[]> {
    return DEVICE_FILTERS;
  }

  async toggleDevice(
    deviceId: string,
    homeId?: string
  ): Promise<ApiResponse<{ isOn: boolean }>> {
    if (!useMockData && homeId) {
      const listed = await this.getDevices(homeId, "all", 1, 100);
      const device = listed.data?.items.find((d) => d.id === deviceId);
      const turnOn = !device?.isOn;
      const res = await apiFetch<{ status: string }>(
        `/v1/homes/${homeId}/devices/${deviceId}/commands`,
        {
          method: "POST",
          body: JSON.stringify({
            type: turnOn ? "TURN_ON" : "TURN_OFF",
            params: {},
            idempotencyKey: `ui-${deviceId}-${Date.now()}`,
          }),
        }
      );
      if (!res.success) return { success: false, error: res.error };
      return { success: true, data: { isOn: turnOn } };
    }
    await delay(400);
    const device = MOCK_DEVICES.find((d) => d.id === deviceId);
    if (!device) return { success: false, error: "Perangkat tidak ditemukan." };
    const isOn = !device.isOn;
    device.isOn = isOn;
    device.value = isOn ? "ON" : "OFF";
    return { success: true, data: { isOn } };
  }
}

export const homeService = new HomeService();
export const deviceService = new DeviceService();

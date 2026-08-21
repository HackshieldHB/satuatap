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

export class HomeService {
  async getHomes(): Promise<ApiResponse<Home[]>> {
    await delay(400);
    return { success: true, data: MOCK_HOMES };
  }

  async getHomeById(id: string): Promise<ApiResponse<Home>> {
    await delay(300);
    const home = MOCK_HOMES.find((h) => h.id === id);
    if (!home) return { success: false, error: "Rumah tidak ditemukan." };
    return { success: true, data: home };
  }

  async getDashboard(homeId: string): Promise<ApiResponse<DashboardData>> {
    await delay(600);
    const data = homeId === "home-2" ? MOCK_DASHBOARD_HOME2 : MOCK_DASHBOARD;
    return { success: true, data };
  }

  async getRooms(homeId: string): Promise<ApiResponse<Room[]>> {
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
          ["electricity_meter", "smart_plug"].includes(d.type)
        );
        break;
      case "water":
        filtered = filtered.filter((d) => d.type === "water_meter");
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
    deviceId: string
  ): Promise<ApiResponse<{ isOn: boolean }>> {
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

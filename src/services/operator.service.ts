import { apiFetch } from "@/services/http";

export interface MaintenanceAlert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  createdAt: string;
}

export interface MaintenanceDevice {
  deviceId: string;
  name: string;
  type: string;
  homeId: string;
  homeName: string;
  roomName: string;
  status: "online" | "offline" | "unknown";
  lastSeen: string | null;
  underMaintenance: boolean;
  maintenanceNote: string | null;
  openAlerts: MaintenanceAlert[];
}

/** Operator (maintenance technician) view of faulty devices across a building. */
export const operatorService = {
  getMaintenance(buildingId: string) {
    return apiFetch<MaintenanceDevice[]>(`/v1/buildings/${buildingId}/maintenance`);
  },
  setMaintenance(deviceId: string, underMaintenance: boolean, note?: string) {
    return apiFetch<{ id: string; underMaintenance: boolean }>(
      `/v1/devices/${deviceId}/maintenance`,
      { method: "PATCH", body: JSON.stringify({ underMaintenance, note }) }
    );
  },
  resolveAlerts(deviceId: string) {
    return apiFetch<{ resolved: number }>(
      `/v1/devices/${deviceId}/maintenance/resolve-alerts`,
      { method: "POST" }
    );
  },
};

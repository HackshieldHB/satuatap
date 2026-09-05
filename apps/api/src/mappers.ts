import type { Device, Room, Home, DeviceCapability, LightingState } from "@prisma/client";

type DeviceWithRelations = Device & {
  capabilities: DeviceCapability[];
  room: Room;
  lighting?: LightingState | null;
};

export function mapHome(h: Home, extra?: { deviceCount?: number; roomCount?: number }) {
  return {
    id: h.id,
    name: h.name,
    type: h.type,
    location: h.location,
    deviceCount: extra?.deviceCount ?? 0,
    roomCount: extra?.roomCount ?? 0,
    ownerId: h.ownerId,
    buildingId: h.buildingId ?? null,
    createdAt: h.createdAt.toISOString(),
  };
}

export function mapRoom(r: Room, extra?: { deviceCount?: number; activeDevices?: number; temperature?: number }) {
  return {
    id: r.id,
    homeId: r.homeId,
    name: r.name,
    deviceCount: extra?.deviceCount ?? 0,
    temperature: extra?.temperature,
    activeDevices: extra?.activeDevices ?? 0,
    icon: r.icon ?? undefined,
  };
}

export function formatMetricValue(
  type: string,
  metrics: Record<string, unknown> | null,
  isOn: boolean | null
): string | undefined {
  if (!metrics) {
    if (isOn === true) return "ON";
    if (isOn === false) return "OFF";
    return undefined;
  }
  if (typeof metrics.energy_kwh === "number") return `${metrics.energy_kwh.toFixed(2)} kWh`;
  if (typeof metrics.volume_liters === "number") return `${Math.round(metrics.volume_liters)} L`;
  if (typeof metrics.temperature_c === "number") return `${metrics.temperature_c.toFixed(1)}°C`;
  if (typeof metrics.motion === "boolean")
    return metrics.motion ? "Gerakan terdeteksi" : "Tidak ada aktivitas";
  if (typeof metrics.on === "boolean") return metrics.on ? "ON" : "OFF";
  if (isOn === true) return "ON";
  if (isOn === false) return "OFF";
  if (type === "light" || type === "switch") return isOn ? "ON" : "OFF";
  return undefined;
}

export function mapDevice(
  d: DeviceWithRelations,
  latestMetrics?: Record<string, unknown> | null
) {
  const caps = d.capabilities.map((c) => c.capability);
  const isOn = d.lighting?.isOn ?? d.isOn ?? undefined;
  return {
    id: d.id,
    homeId: d.homeId,
    roomId: d.roomId,
    name: d.name,
    type: d.type,
    protocol: d.protocol,
    status: d.status,
    room: d.room.name,
    value: formatMetricValue(d.type, latestMetrics ?? null, isOn ?? null),
    isOn,
    lastUpdated: (d.lastSeen ?? d.createdAt).toISOString(),
    lastSeen: d.lastSeen?.toISOString(),
    capabilities: caps,
    firmware: {
      model: d.firmwareModel ?? undefined,
      version: d.firmwareVersion ?? undefined,
    },
    nodeId: d.nodeId ?? undefined,
    macAddress: d.macAddress ?? undefined,
    ipAddress: d.ipAddress ?? undefined,
    buildNumber: d.buildNumber ?? undefined,
    config: (d.config as Record<string, unknown> | null) ?? undefined,
  };
}

export function uiDeviceType(type: string): string {
  if (type === "environment_sensor") return "temperature_sensor";
  if (type === "energy_meter") return "electricity_meter";
  return type;
}

export function mapDeviceForUi(
  d: DeviceWithRelations,
  latestMetrics?: Record<string, unknown> | null
) {
  const mapped = mapDevice(d, latestMetrics);
  return { ...mapped, type: uiDeviceType(d.type) };
}

import { prisma, AlertType } from "@satu-atap/db";

// Operator (maintenance technician) or manager with any membership in the
// building may work its devices.
export async function canOperate(userId: string, buildingId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || (user.role !== "operator" && user.role !== "manager")) return false;
  const m = await prisma.membership.findFirst({ where: { userId, home: { buildingId } } });
  return !!m;
}

const FAULT_ALERT_TYPES: AlertType[] = [AlertType.DEVICE_OFFLINE, AlertType.SENSOR_ERROR];

/**
 * Devices in a building that need a technician: offline/unknown, flagged under
 * maintenance, or carrying an open fault alert. Each row carries its open
 * device-fault alerts so the operator can triage from one screen.
 */
export async function listBuildingMaintenance(buildingId: string) {
  const homes = await prisma.home.findMany({ where: { buildingId }, select: { id: true, name: true } });
  const homeIds = homes.map((h) => h.id);
  const homeName = new Map(homes.map((h) => [h.id, h.name]));
  if (homeIds.length === 0) return [];

  const openAlerts = await prisma.alert.findMany({
    where: { homeId: { in: homeIds }, status: "open", type: { in: FAULT_ALERT_TYPES }},
    orderBy: { createdAt: "desc" },
  });
  const alertsByDevice = new Map<string, typeof openAlerts>();
  for (const a of openAlerts) {
    if (!a.deviceId) continue;
    const arr = alertsByDevice.get(a.deviceId) ?? [];
    arr.push(a);
    alertsByDevice.set(a.deviceId, arr);
  }

  const devices = await prisma.device.findMany({
    where: {
      homeId: { in: homeIds },
      OR: [
        { status: { in: ["offline", "unknown"] } },
        { underMaintenance: true },
        { id: { in: [...alertsByDevice.keys()] } },
      ],
    },
    include: { room: { select: { name: true } } },
    orderBy: [{ underMaintenance: "desc" }, { status: "asc" }, { name: "asc" }],
  });

  return devices.map((d) => ({
    deviceId: d.id,
    name: d.name,
    type: d.type,
    homeId: d.homeId,
    homeName: homeName.get(d.homeId) ?? "",
    roomName: d.room?.name ?? "",
    status: d.status,
    lastSeen: d.lastSeen?.toISOString() ?? null,
    underMaintenance: d.underMaintenance,
    maintenanceNote: d.maintenanceNote,
    openAlerts: (alertsByDevice.get(d.id) ?? []).map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      createdAt: a.createdAt.toISOString(),
    })),
  }));
}

export async function setDeviceMaintenance(deviceId: string, underMaintenance: boolean, note?: string) {
  const d = await prisma.device.update({
    where: { id: deviceId },
    data: { underMaintenance, maintenanceNote: note ?? (underMaintenance ? undefined : null) },
    select: { id: true, underMaintenance: true, maintenanceNote: true, homeId: true },
  });
  return d;
}

/** Resolve a device's open fault alerts (technician cleared the issue). */
export async function resolveDeviceAlerts(deviceId: string, userId: string) {
  const res = await prisma.alert.updateMany({
    where: { deviceId, status: "open", type: { in: FAULT_ALERT_TYPES }},
    data: { status: "resolved", acknowledgedAt: new Date(), acknowledgedById: userId },
  });
  return { resolved: res.count };
}

export async function deviceBuildingId(deviceId: string): Promise<string | null> {
  const d = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { home: { select: { buildingId: true } } },
  });
  return d?.home.buildingId ?? null;
}

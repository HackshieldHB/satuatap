import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { canOperate, listBuildingMaintenance, setDeviceMaintenance, resolveDeviceAlerts } from "./maintenance.js";

const BUILDING = "building-2";
const HOME = "home-2";
const DEV = "test-maint-dev";

describe("maintenance / roles", () => {
  beforeAll(async () => {
    await prisma.alert.deleteMany({ where: { deviceId: DEV } });
    await prisma.device.deleteMany({ where: { id: DEV } });
    await prisma.device.create({
      data: { id: DEV, homeId: HOME, roomId: "room-b1", type: "energy_meter", name: "Maint Test Meter", protocol: "mqtt", status: "offline" },
    });
    await prisma.alert.create({
      data: { homeId: HOME, deviceId: DEV, type: "DEVICE_OFFLINE", severity: "warning", status: "open", title: "Perangkat offline", message: "Tidak ada telemetri" },
    });
  });

  afterAll(async () => {
    await prisma.alert.deleteMany({ where: { deviceId: DEV } });
    await prisma.device.deleteMany({ where: { id: DEV } });
  });

  it("authorizes operator + manager, denies resident", async () => {
    // Seeded personas: user-operator (operator, VIEWER building-2), user-1 (manager, ADMIN), user-resident (resident, home-1 only)
    expect(await canOperate("user-operator", BUILDING)).toBe(true);
    expect(await canOperate("user-1", BUILDING)).toBe(true);
    expect(await canOperate("user-resident", BUILDING)).toBe(false);
  });

  it("lists faulty devices with their open alerts", async () => {
    const rows = await listBuildingMaintenance(BUILDING);
    const row = rows.find((r) => r.deviceId === DEV);
    expect(row).toBeTruthy();
    expect(row!.status).toBe("offline");
    expect(row!.openAlerts.length).toBeGreaterThanOrEqual(1);
  });

  it("flags and clears maintenance, and resolves alerts", async () => {
    const d = await setDeviceMaintenance(DEV, true, "Ganti sensor");
    expect(d.underMaintenance).toBe(true);
    const res = await resolveDeviceAlerts(DEV, "user-operator");
    expect(res.resolved).toBeGreaterThanOrEqual(1);
    const stillOpen = await prisma.alert.count({ where: { deviceId: DEV, status: "open" } });
    expect(stillOpen).toBe(0);
  });
});

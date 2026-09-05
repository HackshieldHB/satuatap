import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { createPass, verifyAndUnlock, revokePass, residentUnlock } from "./access.js";

const HOME = "test-access-home";
const ROOM = "test-access-room";
const LOCK = "lock-test-access"; // id must start with "lock" to be discovered

describe("access control", () => {
  beforeAll(async () => {
    await prisma.accessLog.deleteMany({ where: { homeId: HOME } });
    await prisma.accessPass.deleteMany({ where: { homeId: HOME } });
    await prisma.command.deleteMany({ where: { deviceId: LOCK } });
    await prisma.deviceCapability.deleteMany({ where: { deviceId: LOCK } });
    await prisma.device.deleteMany({ where: { id: LOCK } });
    await prisma.room.deleteMany({ where: { id: ROOM } });
    await prisma.home.deleteMany({ where: { id: HOME } });

    await prisma.home.create({
      data: { id: HOME, organizationId: "org-1", ownerId: "user-1", name: "Access Test Unit", type: "apartment", location: "Test" },
    });
    await prisma.room.create({ data: { id: ROOM, homeId: HOME, name: "Test Room" } });
    await prisma.device.create({
      data: {
        id: LOCK, homeId: HOME, roomId: ROOM, type: "switch", name: "Test Lock", protocol: "mqtt", status: "online",
        capabilities: { create: [{ capability: "on_off" }] },
      },
    });
  });

  afterAll(async () => {
    await prisma.accessLog.deleteMany({ where: { homeId: HOME } });
    await prisma.accessPass.deleteMany({ where: { homeId: HOME } });
    await prisma.command.deleteMany({ where: { deviceId: LOCK } });
    await prisma.deviceCapability.deleteMany({ where: { deviceId: LOCK } });
    await prisma.device.deleteMany({ where: { id: LOCK } });
    await prisma.room.deleteMany({ where: { id: ROOM } });
    await prisma.home.deleteMany({ where: { id: HOME } });
  });

  it("grants a valid PIN and drives the lock", async () => {
    const pass = await createPass({ homeId: HOME, label: "Tamu Uji", validMinutes: 60 });
    const res = await verifyAndUnlock(HOME, pass.pin);
    expect(res.granted).toBe(true);

    const cmd = await prisma.command.findFirst({ where: { deviceId: LOCK, type: "TURN_ON" } });
    expect(cmd).not.toBeNull();

    const after = await prisma.accessPass.findUniqueOrThrow({ where: { id: pass.id } });
    expect(after.uses).toBe(1);
  });

  it("denies an unknown code", async () => {
    const res = await verifyAndUnlock(HOME, "000000");
    expect(res.granted).toBe(false);
  });

  it("denies a revoked pass", async () => {
    const pass = await createPass({ homeId: HOME, label: "Dicabut", validMinutes: 60 });
    await revokePass(HOME, pass.id);
    const res = await verifyAndUnlock(HOME, pass.pin);
    expect(res.granted).toBe(false);
  });

  it("lets a resident unlock directly", async () => {
    const res = await residentUnlock(HOME, "Penghuni Uji");
    expect(res.ok).toBe(true);
    const log = await prisma.accessLog.findFirst({ where: { homeId: HOME, action: "resident_unlock" } });
    expect(log).not.toBeNull();
  });
});

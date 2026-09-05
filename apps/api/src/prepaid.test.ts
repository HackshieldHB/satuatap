import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { applyPrepaidUsage, topupPrepaid, getPrepaidStatus } from "./prepaid.js";

// Fully isolated fixtures (own home/room/relay) so concurrent ingest tests that
// stream telemetry into home-1 cannot trigger this unit's prepaid debit and
// race the disconnect/reconnect assertions.
const HOME = "test-prepaid-home";
const ROOM = "test-prepaid-room";
const RELAY = "test-prepaid-relay";

describe("prepaid wallet", () => {
  beforeAll(async () => {
    await prisma.command.deleteMany({ where: { deviceId: RELAY } });
    await prisma.prepaidTransaction.deleteMany({ where: { homeId: HOME } });
    await prisma.prepaidAccount.deleteMany({ where: { homeId: HOME } });
    await prisma.deviceCapability.deleteMany({ where: { deviceId: RELAY } });
    await prisma.device.deleteMany({ where: { id: RELAY } });
    await prisma.utilityConfig.deleteMany({ where: { homeId: HOME } });
    await prisma.room.deleteMany({ where: { id: ROOM } });
    await prisma.home.deleteMany({ where: { id: HOME } });

    await prisma.home.create({
      data: {
        id: HOME,
        organizationId: "org-1",
        ownerId: "user-1",
        name: "Prepaid Test Unit",
        type: "apartment",
        location: "Test",
      },
    });
    await prisma.room.create({ data: { id: ROOM, homeId: HOME, name: "Test Room" } });
    await prisma.device.create({
      data: {
        id: RELAY,
        homeId: HOME,
        roomId: ROOM,
        type: "switch",
        name: "Prepaid Test Relay",
        protocol: "mqtt",
        status: "online",
        capabilities: { create: [{ capability: "on_off" }] },
      },
    });
    await prisma.utilityConfig.create({
      data: { homeId: HOME, electricityTariffPerKwh: 1000, waterTariffPerM3: 0, serviceChargeIdr: 0 },
    });
    await prisma.prepaidAccount.create({
      data: {
        homeId: HOME,
        enabled: true,
        balanceIdr: 5000,
        electricityRelayDeviceId: RELAY,
        lowBalanceThresholdIdr: 3000,
      },
    });
  });

  afterAll(async () => {
    await prisma.command.deleteMany({ where: { deviceId: RELAY } });
    await prisma.prepaidTransaction.deleteMany({ where: { homeId: HOME } });
    await prisma.prepaidAccount.deleteMany({ where: { homeId: HOME } });
    await prisma.deviceCapability.deleteMany({ where: { deviceId: RELAY } });
    await prisma.device.deleteMany({ where: { id: RELAY } });
    await prisma.utilityConfig.deleteMany({ where: { homeId: HOME } });
    await prisma.room.deleteMany({ where: { id: ROOM } });
    await prisma.home.deleteMany({ where: { id: HOME } });
  });

  it("debits usage and auto-disconnects at zero balance", async () => {
    // 2 kWh × 1000 = 2000 → balance 5000 → 3000 (also crosses low threshold)
    await applyPrepaidUsage(HOME, { energy_kwh_delta: 2 });
    let status = await getPrepaidStatus(HOME);
    expect(status?.balanceIdr).toBeCloseTo(3000, 2);
    expect(status?.disconnected).toBe(false);

    // 4 kWh × 1000 = 4000 → 3000 → -1000 → disconnect
    await applyPrepaidUsage(HOME, { energy_kwh_delta: 4 });
    status = await getPrepaidStatus(HOME);
    expect(status!.balanceIdr).toBeLessThanOrEqual(0);
    expect(status?.disconnected).toBe(true);

    const offCmd = await prisma.command.findFirst({
      where: { deviceId: RELAY, type: "TURN_OFF" },
    });
    expect(offCmd).not.toBeNull();
  });

  it("reconnects on top-up", async () => {
    await topupPrepaid(HOME, 50000, { paymentChannel: "qris" });
    const status = await getPrepaidStatus(HOME);
    expect(status!.balanceIdr).toBeGreaterThan(0);
    expect(status?.disconnected).toBe(false);

    const onCmd = await prisma.command.findFirst({
      where: { deviceId: RELAY, type: "TURN_ON" },
    });
    expect(onCmd).not.toBeNull();
  });
});

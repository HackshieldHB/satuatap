import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { generateInvoiceForHome, payInvoice, canManageBuilding, listInvoices } from "./billing.js";

// Uses home-2 / building-2 (user-1 is ADMIN there per seed) to avoid colliding
// with the prepaid test that mutates home-1. A throwaway device carries one
// hourly aggregate in a fixed historical month.
const HOME = "home-2";
const BUILDING = "building-2";
const DEV = "test-billing-dev";
const PERIOD = new Date(Date.UTC(2020, 0, 1)); // Jan 2020

describe("billing", () => {
  beforeAll(async () => {
    await prisma.invoice.deleteMany({ where: { homeId: HOME, periodStart: PERIOD } });
    await prisma.telemetryAggregate.deleteMany({ where: { deviceId: DEV } });
    await prisma.device.deleteMany({ where: { id: DEV } });
    await prisma.device.create({
      data: { id: DEV, homeId: HOME, roomId: "room-b1", type: "energy_meter", name: "Billing Test Meter", protocol: "mqtt", status: "online" },
    });
    await prisma.prepaidAccount.upsert({
      where: { homeId: HOME },
      update: { enabled: false },
      create: { homeId: HOME, enabled: false },
    });
    await prisma.utilityConfig.upsert({
      where: { homeId: HOME },
      update: { electricityTariffPerKwh: 1500, waterTariffPerM3: 0, serviceChargeIdr: 250000 },
      create: { homeId: HOME, electricityTariffPerKwh: 1500, waterTariffPerM3: 0, serviceChargeIdr: 250000 },
    });
    // 10 kWh consumed in Jan 2020.
    await prisma.telemetryAggregate.create({
      data: {
        homeId: HOME, deviceId: DEV, period: "hour",
        periodStart: new Date(Date.UTC(2020, 0, 15, 3)),
        metric: "energy_kwh_delta", avg: 10, min: 0, max: 10, sum: 10, last: 0, sampleCount: 1,
      },
    });
  });

  afterAll(async () => {
    await prisma.invoice.deleteMany({ where: { homeId: HOME, periodStart: PERIOD } });
    await prisma.telemetryAggregate.deleteMany({ where: { deviceId: DEV } });
    await prisma.device.deleteMany({ where: { id: DEV } });
  });

  it("generates an invoice with metered electricity + IPL", async () => {
    const inv = await generateInvoiceForHome(HOME, PERIOD);
    const elec = inv.lines.find((l) => l.kind === "electricity");
    const ipl = inv.lines.find((l) => l.kind === "ipl");
    expect(elec?.amountIdr).toBe(15000); // 10 kWh × 1500
    expect(ipl?.amountIdr).toBe(250000);
    expect(inv.totalIdr).toBe(265000);
    expect(inv.status).toBe("unpaid");
  });

  it("marks an invoice paid", async () => {
    const before = (await listInvoices(HOME)).find((i) => i.periodLabel === "Januari 2020")!;
    const paid = await payInvoice(before.id, "qris");
    expect(paid.status).toBe("paid");
    expect(paid.paidAt).not.toBeNull();
  });

  it("recognises the building manager", async () => {
    expect(await canManageBuilding("user-1", BUILDING)).toBe(true);
    expect(await canManageBuilding("user-1", "building-nonexistent")).toBe(false);
  });
});

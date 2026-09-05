import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { getInsights, getLeaderboard } from "./insights.js";

const HOME = "test-insights-home";
const ROOM = "test-insights-room";
const DEV = "test-insights-dev";

describe("insights", () => {
  beforeAll(async () => {
    await prisma.telemetryAggregate.deleteMany({ where: { deviceId: DEV } });
    await prisma.device.deleteMany({ where: { id: DEV } });
    await prisma.utilityConfig.deleteMany({ where: { homeId: HOME } });
    await prisma.room.deleteMany({ where: { id: ROOM } });
    await prisma.home.deleteMany({ where: { id: HOME } });

    await prisma.home.create({
      data: { id: HOME, organizationId: "org-1", ownerId: "user-1", name: "Insights Test Unit", type: "apartment", location: "Test", buildingId: "building-1" },
    });
    await prisma.room.create({ data: { id: ROOM, homeId: HOME, name: "Test Room" } });
    await prisma.device.create({
      data: { id: DEV, homeId: HOME, roomId: ROOM, type: "energy_meter", name: "Insights Meter", protocol: "mqtt", status: "online" },
    });
    await prisma.utilityConfig.create({
      data: { homeId: HOME, electricityTariffPerKwh: 1500, waterTariffPerM3: 18000, serviceChargeIdr: 250000 },
    });
    // A current-month hourly energy aggregate so the forecast has data.
    const now = new Date();
    const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 3));
    await prisma.telemetryAggregate.create({
      data: { homeId: HOME, deviceId: DEV, period: "hour", periodStart: at, metric: "energy_kwh_delta", avg: 30, min: 0, max: 30, sum: 30, last: 0, sampleCount: 1 },
    });
  });

  afterAll(async () => {
    await prisma.telemetryAggregate.deleteMany({ where: { deviceId: DEV } });
    await prisma.device.deleteMany({ where: { id: DEV } });
    await prisma.utilityConfig.deleteMany({ where: { homeId: HOME } });
    await prisma.room.deleteMany({ where: { id: ROOM } });
    await prisma.home.deleteMany({ where: { id: HOME } });
  });

  it("produces a bill forecast from month-to-date usage", async () => {
    const insights = await getInsights(HOME);
    const forecast = insights.find((i) => i.kind === "forecast");
    expect(forecast).toBeTruthy();
    expect(forecast!.valueIdr).toBeGreaterThan(0);
  });

  it("ranks building units by efficiency", async () => {
    const board = await getLeaderboard("building-1");
    expect(board.length).toBeGreaterThan(0);
    expect(board[0].rank).toBe(1);
    for (const r of board) expect(r.ecoScore).toBeGreaterThanOrEqual(10);
    // sorted ascending by kwh
    for (let i = 1; i < board.length; i++) expect(board[i].kwh).toBeGreaterThanOrEqual(board[i - 1].kwh);
  });
});

import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { buildApp } from "./app.js";

const NODE_ID = "test-node-p1-lighting";
const DEV_A = "test-p1-light-a";
const DEV_B = "test-p1-light-b";

describe("node availability", () => {
  afterAll(async () => {
    await prisma.alert.deleteMany({ where: { deviceId: { in: [DEV_A, DEV_B] } } });
    await prisma.deviceHeartbeat.deleteMany({ where: { deviceId: { in: [DEV_A, DEV_B] } } });
    await prisma.device.deleteMany({ where: { id: { in: [DEV_A, DEV_B] } } });
  });

  it("fans out to all devices and raises exactly one alert", async () => {
    await prisma.device.deleteMany({ where: { id: { in: [DEV_A, DEV_B] } } });
    await prisma.device.createMany({
      data: [
        {
          id: DEV_A,
          homeId: "home-1",
          roomId: "room-1",
          type: "light",
          name: "P1 Test Light A",
          protocol: "mqtt",
          status: "online",
          nodeId: NODE_ID,
        },
        {
          id: DEV_B,
          homeId: "home-1",
          roomId: "room-1",
          type: "light",
          name: "P1 Test Light B",
          protocol: "mqtt",
          status: "online",
          nodeId: NODE_ID,
        },
      ],
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/internal/availability",
      headers: { "x-internal-key": "local-internal-key" },
      payload: {
        homeId: "home-1",
        nodeId: NODE_ID,
        payload: { status: "offline" },
      },
    });
    expect(res.statusCode).toBe(200);

    const devices = await prisma.device.findMany({
      where: { id: { in: [DEV_A, DEV_B] } },
    });
    expect(devices.every((d) => d.status === "offline")).toBe(true);

    const alerts = await prisma.alert.findMany({
      where: {
        type: "DEVICE_OFFLINE",
        deviceId: { in: [DEV_A, DEV_B] },
        title: "Node offline",
      },
    });
    expect(alerts).toHaveLength(1);
    await app.close();
  });
});

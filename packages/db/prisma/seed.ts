import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const deviceSecretHash = await bcrypt.hash("dev-secret-local-only", 10);
  const mqttPasswordHash = await bcrypt.hash("mqtt-dev", 10);

  await prisma.user.upsert({
    where: { email: "kevin.santoso@gmail.com" },
    update: { passwordHash },
    create: {
      id: "user-1",
      email: "kevin.santoso@gmail.com",
      passwordHash,
      fullName: "Kevin Santoso",
      phone: "081234567890",
    },
  });

  await prisma.organization.upsert({
    where: { id: "org-1" },
    update: {},
    create: { id: "org-1", name: "SATU ATAP Demo" },
  });

  await prisma.site.upsert({
    where: { id: "site-1" },
    update: {},
    create: {
      id: "site-1",
      organizationId: "org-1",
      name: "Jakarta Selatan",
      timezone: "Asia/Jakarta",
    },
  });

  await prisma.building.upsert({
    where: { id: "building-1" },
    update: {},
    create: { id: "building-1", siteId: "site-1", name: "Rumah Kevin" },
  });

  await prisma.floor.upsert({
    where: { id: "floor-1" },
    update: {},
    create: { id: "floor-1", buildingId: "building-1", name: "Lantai 1" },
  });

  await prisma.home.upsert({
    where: { id: "home-1" },
    update: {},
    create: {
      id: "home-1",
      organizationId: "org-1",
      siteId: "site-1",
      buildingId: "building-1",
      floorId: "floor-1",
      ownerId: "user-1",
      name: "Rumah Kevin",
      type: "house",
      location: "Jakarta Selatan",
    },
  });

  await prisma.home.upsert({
    where: { id: "home-2" },
    update: {},
    create: {
      id: "home-2",
      organizationId: "org-1",
      siteId: "site-1",
      ownerId: "user-1",
      name: "Villa Puncak",
      type: "villa",
      location: "Bandung",
    },
  });

  for (const homeId of ["home-1", "home-2"] as const) {
    await prisma.membership.upsert({
      where: { userId_homeId: { userId: "user-1", homeId } },
      update: { role: "ADMIN" },
      create: { userId: "user-1", homeId, role: "ADMIN" },
    });
    await prisma.utilityConfig.upsert({
      where: { homeId },
      update: {},
      create: {
        homeId,
        electricityTariffPerKwh: 1444.7,
        waterTariffPerM3: 18000,
        currency: "IDR",
      },
    });
  }

  const rooms = [
    { id: "room-1", homeId: "home-1", name: "Ruang Tamu" },
    { id: "room-2", homeId: "home-1", name: "Kamar Tidur" },
    { id: "room-3", homeId: "home-1", name: "Dapur" },
    { id: "room-v1", homeId: "home-2", name: "Ruang Keluarga" },
  ];
  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: { name: r.name },
      create: r,
    });
  }

  type SeedDevice = {
    id: string;
    homeId: string;
    roomId: string;
    type: string;
    name: string;
    capabilities: string[];
    isOn?: boolean;
  };

  const devices: SeedDevice[] = [
    {
      id: "dev-energy",
      homeId: "home-1",
      roomId: "room-1",
      type: "energy_meter",
      name: "Energy Meter",
      capabilities: ["voltage", "current", "power", "energy", "frequency", "power_factor"],
    },
    {
      id: "dev-water",
      homeId: "home-1",
      roomId: "room-3",
      type: "water_meter",
      name: "Water Meter",
      capabilities: ["flow", "volume"],
    },
    {
      id: "dev-env-living",
      homeId: "home-1",
      roomId: "room-1",
      type: "environment_sensor",
      name: "Living Room Temperature",
      capabilities: ["temperature", "humidity"],
    },
    {
      id: "dev-env-bed",
      homeId: "home-1",
      roomId: "room-2",
      type: "environment_sensor",
      name: "Bedroom Temperature",
      capabilities: ["temperature", "humidity"],
    },
    {
      id: "dev-pir-living",
      homeId: "home-1",
      roomId: "room-1",
      type: "motion_sensor",
      name: "Living Room Motion",
      capabilities: ["motion"],
    },
    {
      id: "dev-light-living",
      homeId: "home-1",
      roomId: "room-1",
      type: "light",
      name: "Living Room Light",
      capabilities: ["on_off", "brightness"],
      isOn: false,
    },
    {
      id: "dev-light-bed",
      homeId: "home-1",
      roomId: "room-2",
      type: "light",
      name: "Bedroom Light",
      capabilities: ["on_off", "brightness"],
      isOn: false,
    },
    {
      id: "dev-light-kitchen",
      homeId: "home-1",
      roomId: "room-3",
      type: "light",
      name: "Kitchen Light",
      capabilities: ["on_off", "brightness"],
      isOn: false,
    },
  ];

  for (const d of devices) {
    await prisma.device.upsert({
      where: { id: d.id },
      update: { name: d.name, type: d.type, isOn: d.isOn ?? null },
      create: {
        id: d.id,
        homeId: d.homeId,
        roomId: d.roomId,
        type: d.type,
        name: d.name,
        protocol: "mqtt",
        status: "unknown",
        firmwareModel: "simulator",
        firmwareVersion: "1.0.0",
        claimToken: `claim-${d.id}`,
        isOn: d.isOn ?? null,
      },
    });
    await prisma.deviceCapability.deleteMany({ where: { deviceId: d.id } });
    await prisma.deviceCapability.createMany({
      data: d.capabilities.map((capability) => ({ deviceId: d.id, capability })),
    });
    await prisma.deviceCredential.upsert({
      where: { deviceId: d.id },
      update: {},
      create: {
        deviceId: d.id,
        mqttUsername: d.id,
        mqttPasswordHash,
        deviceSecretHash,
      },
    });
    if (d.type === "light") {
      await prisma.lightingState.upsert({
        where: { deviceId: d.id },
        update: {},
        create: { deviceId: d.id, isOn: d.isOn ?? false, brightness: 80 },
      });
    }
  }

  const existingRule = await prisma.automationRule.findFirst({
    where: { id: "auto-motion-living" },
  });
  if (!existingRule) {
    await prisma.automationRule.create({
      data: {
        id: "auto-motion-living",
        homeId: "home-1",
        name: "Living Room Motion Light",
        enabled: true,
        icon: "activity",
        trigger: { type: "MOTION_DETECTED", deviceId: "dev-pir-living" },
        conditions: [{ type: "TIME_RANGE", from: "00:00", to: "23:59" }],
        actions: [{ type: "TURN_ON", deviceId: "dev-light-living" }],
      },
    });
  }

  console.log("Seed complete: user-1 / home-1 / 8 software devices");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

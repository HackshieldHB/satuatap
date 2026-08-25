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
    nodeId: string;
    capabilities: string[];
    isOn?: boolean;
    config?: Record<string, unknown>;
  };

  const devices: SeedDevice[] = [
    {
      id: "energy-main",
      homeId: "home-1",
      roomId: "room-1",
      type: "energy_meter",
      name: "Energy Main",
      nodeId: "esp32-energy-001",
      capabilities: ["voltage", "current", "power", "energy", "frequency", "power_factor"],
      config: { ctRatio: 1, offsetKwh: 0 },
    },
    {
      id: "energy-ac",
      homeId: "home-1",
      roomId: "room-2",
      type: "energy_meter",
      name: "Energy AC",
      nodeId: "esp32-energy-001",
      capabilities: ["voltage", "current", "power", "energy", "frequency", "power_factor"],
      config: { ctRatio: 1, offsetKwh: 0 },
    },
    {
      id: "water-main",
      homeId: "home-1",
      roomId: "room-3",
      type: "water_meter",
      name: "Water Main",
      nodeId: "esp32-water-env-001",
      capabilities: ["flow", "volume"],
      config: { pulsesPerLiter: 450, offsetLiters: 0 },
    },
    {
      id: "water-kitchen",
      homeId: "home-1",
      roomId: "room-3",
      type: "water_meter",
      name: "Water Kitchen",
      nodeId: "esp32-water-env-001",
      capabilities: ["flow", "volume"],
      config: { pulsesPerLiter: 450, offsetLiters: 0 },
    },
    {
      id: "env-living-room",
      homeId: "home-1",
      roomId: "room-1",
      type: "environment_sensor",
      name: "Living Room Environment",
      nodeId: "esp32-water-env-001",
      capabilities: ["temperature", "humidity"],
    },
    {
      id: "env-bedroom",
      homeId: "home-1",
      roomId: "room-2",
      type: "environment_sensor",
      name: "Bedroom Environment",
      nodeId: "esp32-water-env-001",
      capabilities: ["temperature", "humidity"],
    },
    {
      id: "pir-living-room",
      homeId: "home-1",
      roomId: "room-1",
      type: "motion_sensor",
      name: "Living Room Motion",
      nodeId: "esp32-water-env-001",
      capabilities: ["motion"],
    },
    {
      id: "pir-bedroom",
      homeId: "home-1",
      roomId: "room-2",
      type: "motion_sensor",
      name: "Bedroom Motion",
      nodeId: "esp32-water-env-001",
      capabilities: ["motion"],
    },
    {
      id: "light-living-room",
      homeId: "home-1",
      roomId: "room-1",
      type: "light",
      name: "Living Room Light",
      nodeId: "esp32-lighting-001",
      capabilities: ["on_off"],
      isOn: false,
    },
    {
      id: "light-bedroom",
      homeId: "home-1",
      roomId: "room-2",
      type: "light",
      name: "Bedroom Light",
      nodeId: "esp32-lighting-001",
      capabilities: ["on_off"],
      isOn: false,
    },
    {
      id: "light-kitchen",
      homeId: "home-1",
      roomId: "room-3",
      type: "light",
      name: "Kitchen Light",
      nodeId: "esp32-lighting-001",
      capabilities: ["on_off"],
      isOn: false,
    },
    {
      id: "light-spare",
      homeId: "home-1",
      roomId: "room-3",
      type: "light",
      name: "Spare Light",
      nodeId: "esp32-lighting-001",
      capabilities: ["on_off"],
      isOn: false,
    },
  ];

  const keepIds = devices.map((d) => d.id);
  await prisma.device.deleteMany({
    where: { homeId: "home-1", id: { notIn: keepIds } },
  });

  for (const d of devices) {
    await prisma.device.upsert({
      where: { id: d.id },
      update: {
        name: d.name,
        type: d.type,
        isOn: d.isOn ?? null,
        nodeId: d.nodeId,
        config: d.config ?? undefined,
        protocol: "mqtt",
      },
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
        nodeId: d.nodeId,
        config: d.config ?? undefined,
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
        update: { brightness: null },
        create: { deviceId: d.id, isOn: d.isOn ?? false, brightness: null },
      });
    }
  }

  await prisma.gateway.upsert({
    where: { id: "gw-pi-001" },
    update: { name: "Raspberry Pi — Rumah Kevin", siteId: "site-1" },
    create: {
      id: "gw-pi-001",
      siteId: "site-1",
      name: "Raspberry Pi — Rumah Kevin",
      version: "0.1.0",
    },
  });

  await prisma.automationRule.upsert({
    where: { id: "auto-living-motion-light" },
    update: {
      name: "Lampu ruang tamu saat ada gerakan",
      enabled: true,
      trigger: { type: "MOTION_DETECTED", deviceId: "pir-living-room" },
      conditions: [{ type: "TIME_RANGE", from: "18:00", to: "23:00" }],
      actions: [{ type: "TURN_ON", deviceId: "light-living-room" }],
    },
    create: {
      id: "auto-living-motion-light",
      homeId: "home-1",
      name: "Lampu ruang tamu saat ada gerakan",
      enabled: true,
      icon: "activity",
      trigger: { type: "MOTION_DETECTED", deviceId: "pir-living-room" },
      conditions: [{ type: "TIME_RANGE", from: "18:00", to: "23:00" }],
      actions: [{ type: "TURN_ON", deviceId: "light-living-room" }],
    },
  });
  await prisma.automationRule.upsert({
    where: { id: "auto-living-no-motion" },
    update: {
      name: "Matikan lampu jika sepi",
      enabled: true,
      trigger: { type: "NO_MOTION_FOR", deviceId: "pir-living-room", minutes: 10 },
      conditions: [],
      actions: [{ type: "TURN_OFF", deviceId: "light-living-room" }],
    },
    create: {
      id: "auto-living-no-motion",
      homeId: "home-1",
      name: "Matikan lampu jika sepi",
      enabled: true,
      icon: "moon",
      trigger: { type: "NO_MOTION_FOR", deviceId: "pir-living-room", minutes: 10 },
      conditions: [],
      actions: [{ type: "TURN_OFF", deviceId: "light-living-room" }],
    },
  });
  await prisma.automationRule.deleteMany({ where: { id: "auto-motion-living" } });

  console.log("Seed complete: user-1 / home-1 / 12 Phase 1 devices");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

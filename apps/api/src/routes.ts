import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma, type Prisma } from "@satu-atap/db";
import {
  DEFAULT_CAPABILITIES,
  createAutomationBodySchema,
  createCommandBodySchema,
  createDeviceBodySchema,
  patchDeviceConfigBodySchema,
  waterMeterConfigSchema,
  energyMeterConfigSchema,
  loginBodySchema,
  ackPayloadSchema,
  telemetryPayloadSchema,
  eventPayloadSchema,
  availabilityPayloadSchema,
  deviceStatusPayloadSchema,
  createOrderBodySchema,
  updateOrderStatusBodySchema,
  prepaidTopupBodySchema,
  prepaidConfigBodySchema,
  payInvoiceBodySchema,
  generateInvoiceBodySchema,
  createPassBodySchema,
  verifyAccessBodySchema,
  type DeviceTypeId,
} from "@satu-atap/shared";
import {
  createPass,
  revokePass,
  listPasses,
  listLogs,
  residentUnlock,
  verifyAndUnlock,
} from "./access.js";
import { getPrepaidStatus, topupPrepaid } from "./prepaid.js";
import {
  generateInvoiceForHome,
  generateBuildingInvoices,
  listInvoices,
  payInvoice,
  listBuildingUnits,
  canManageBuilding,
  parsePeriod,
  monthStart,
} from "./billing.js";
import { authenticate, requireHomeRole, requireInternalKey, audit } from "./auth.js";
import {
  ingestTelemetry,
  applyDeviceStatus,
  ingestDeviceEvent,
  applyNodeAvailability,
} from "./ingest.js";
import { createCommand } from "./automation.js";
import { hub, type AppEvent } from "./events.js";
import { mapHome, mapRoom, mapDeviceForUi } from "./mappers.js";
import { config } from "./config.js";
import { periodWindow } from "./rollup.js";

function startOfUtcDay(d = new Date()): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function dayLabels(): { start: Date; label: string }[] {
  const labels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const start = startOfUtcDay();
    start.setUTCDate(start.getUTCDate() - i);
    out.push({ start, label: labels[start.getUTCDay()] });
  }
  return out;
}

async function latestMetrics(deviceId: string) {
  const row = await prisma.telemetryReading.findFirst({
    where: { deviceId },
    orderBy: { recordedAt: "desc" },
  });
  return (row?.metrics as Record<string, unknown> | undefined) ?? null;
}

async function sumDeltaMetric(
  homeId: string,
  deltaKey: string,
  from: Date,
  to: Date
): Promise<number> {
  const rows = await prisma.telemetryReading.findMany({
    where: { homeId, recordedAt: { gte: from, lt: to } },
    select: { metrics: true },
  });
  let sum = 0;
  for (const r of rows) {
    const v = (r.metrics as Record<string, unknown>)[deltaKey];
    if (typeof v === "number") sum += v;
  }
  return sum;
}

async function powerStats(
  homeId: string,
  from: Date,
  to: Date
): Promise<{ peak: number; average: number }> {
  const rows = await prisma.telemetryAggregate.findMany({
    where: {
      homeId,
      metric: "power",
      period: "hour",
      periodStart: { gte: from, lt: to },
    },
  });
  if (rows.length === 0) {
    const readings = await prisma.telemetryReading.findMany({
      where: { homeId, recordedAt: { gte: from, lt: to } },
      select: { metrics: true },
    });
    const powers = readings
      .map((r) => (r.metrics as Record<string, unknown>).power)
      .filter((v): v is number => typeof v === "number");
    if (powers.length === 0) return { peak: 0, average: 0 };
    return {
      peak: Math.max(...powers),
      average: powers.reduce((a, b) => a + b, 0) / powers.length,
    };
  }
  return {
    peak: Math.max(...rows.map((r) => r.max)),
    average: rows.reduce((a, r) => a + r.avg * r.sampleCount, 0) / Math.max(1, rows.reduce((a, r) => a + r.sampleCount, 0)),
  };
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "healthy",
    services: { api: "up", database: "unknown", mqtt: "unknown" },
  }));

  app.get("/health/db", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "healthy", services: { database: "up" } };
    } catch {
      return reply.code(503).send({ status: "unhealthy", services: { database: "down" } });
    }
  });

  app.get("/health/mqtt", async (_req, reply) => {
    try {
      const res = await fetch(`${config.gatewayUrl}/health`, { signal: AbortSignal.timeout(2000) });
      const body = (await res.json()) as { mqtt?: string };
      const mqtt = body.mqtt === "up" ? "up" : "down";
      if (mqtt === "down") {
        return reply.code(503).send({ status: "unhealthy", services: { mqtt } });
      }
      return { status: "healthy", services: { mqtt } };
    } catch {
      return reply.code(503).send({ status: "unhealthy", services: { mqtt: "down" } });
    }
  });

  app.post("/v1/auth/login", async (req, reply) => {
    const parsed = loginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return reply.code(401).send({ success: false, error: "Email atau kata sandi salah." });
    }
    const token = await reply.jwtSign({ sub: user.id, email: user.email }, { expiresIn: "7d" });
    const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
    await audit(user.id, "auth.login", "User", user.id);
    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone ?? "",
          createdAt: user.createdAt.toISOString(),
        },
        onboardingCompleted: true,
        selectedHomeId: membership?.homeId ?? "home-1",
      },
    };
  });

  app.get("/v1/auth/me", { preHandler: authenticate }, async (req) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    return {
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone ?? "",
        createdAt: user.createdAt.toISOString(),
      },
    };
  });

  app.get("/v1/homes", { preHandler: authenticate }, async (req) => {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user.sub },
      include: { home: { include: { _count: { select: { devices: true, rooms: true } } } } },
    });
    return {
      success: true,
      data: memberships.map((m) =>
        mapHome(m.home, {
          deviceCount: m.home._count.devices,
          roomCount: m.home._count.rooms,
        })
      ),
    };
  });

  app.get("/v1/homes/:homeId", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const home = await prisma.home.findUnique({
      where: { id: homeId },
      include: { _count: { select: { devices: true, rooms: true } } },
    });
    if (!home) return reply.code(404).send({ success: false, error: "Rumah tidak ditemukan." });
    return {
      success: true,
      data: mapHome(home, {
        deviceCount: home._count.devices,
        roomCount: home._count.rooms,
      }),
    };
  });

  app.get("/v1/homes/:homeId/rooms", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const rooms = await prisma.room.findMany({
      where: { homeId },
      include: { devices: true },
    });
    const data = [];
    for (const r of rooms) {
      let temperature: number | undefined;
      for (const d of r.devices) {
        const m = await latestMetrics(d.id);
        if (typeof m?.temperature_c === "number") temperature = m.temperature_c;
      }
      data.push(
        mapRoom(r, {
          deviceCount: r.devices.length,
          activeDevices: r.devices.filter((d) => d.status === "online").length,
          temperature,
        })
      );
    }
    return { success: true, data };
  });

  app.get("/v1/homes/:homeId/devices", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const q = req.query as { filter?: string; page?: string; pageSize?: string };
    const page = Number(q.page ?? 1);
    const pageSize = Number(q.pageSize ?? 20);
    const devices = await prisma.device.findMany({
      where: { homeId },
      include: { capabilities: true, room: true, lighting: true },
    });
    let items = [];
    for (const d of devices) {
      items.push(mapDeviceForUi(d, await latestMetrics(d.id)));
    }
    switch (q.filter) {
      case "online":
        items = items.filter((d) => d.status === "online");
        break;
      case "offline":
        items = items.filter((d) => d.status === "offline");
        break;
      case "sensors":
        items = items.filter((d) =>
          ["temperature_sensor", "humidity_sensor", "motion_sensor"].includes(d.type)
        );
        break;
      case "lights":
        items = items.filter((d) => d.type === "light");
        break;
      case "energy":
        items = items.filter((d) =>
          d.capabilities?.includes("power") || d.type === "electricity_meter"
        );
        break;
      case "water":
        items = items.filter((d) => d.capabilities?.includes("volume") || d.type === "water_meter");
        break;
      default:
        break;
    }
    const start = (page - 1) * pageSize;
    const slice = items.slice(start, start + pageSize);
    return {
      success: true,
      data: {
        items: slice,
        total: items.length,
        page,
        pageSize,
        hasMore: start + pageSize < items.length,
      },
    };
  });

  app.post("/v1/homes/:homeId/devices", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const parsed = createDeviceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    const room = await prisma.room.findFirst({
      where: { id: parsed.data.roomId, homeId },
    });
    if (!room) return reply.code(400).send({ success: false, error: "Invalid room" });
    const type = parsed.data.type as DeviceTypeId;
    const caps = parsed.data.capabilities ?? DEFAULT_CAPABILITIES[type];
    const id = `dev-${crypto.randomUUID()}`;
    const device = await prisma.device.create({
      data: {
        id,
        homeId,
        roomId: parsed.data.roomId,
        type,
        name: parsed.data.name,
        protocol: parsed.data.protocol,
        status: "unknown",
        claimToken: `claim-${id}`,
        capabilities: { create: caps.map((capability) => ({ capability })) },
        credential: {
          create: {
            mqttUsername: id,
            mqttPasswordHash: await bcrypt.hash(crypto.randomUUID(), 8),
            deviceSecretHash: await bcrypt.hash(crypto.randomUUID(), 8),
          },
        },
      },
      include: { capabilities: true, room: true, lighting: true },
    });
    await audit(req.user.sub, "device.created", "Device", device.id, { homeId });
    return { success: true, data: mapDeviceForUi(device, null) };
  });

  app.patch(
    "/v1/homes/:homeId/devices/:deviceId/config",
    { preHandler: authenticate },
    async (req, reply) => {
      const { homeId, deviceId } = req.params as { homeId: string; deviceId: string };
      if (!(await requireHomeRole(req.user.sub, homeId, "ADMIN"))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      const parsed = patchDeviceConfigBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Invalid payload" });
      }
      const device = await prisma.device.findFirst({ where: { id: deviceId, homeId } });
      if (!device) return reply.code(404).send({ success: false, error: "Device not found" });
      const schema =
        device.type === "water_meter"
          ? waterMeterConfigSchema
          : device.type === "energy_meter"
            ? energyMeterConfigSchema
            : null;
      if (!schema) {
        return reply.code(400).send({ success: false, error: "Device type has no config" });
      }
      const cfg = schema.safeParse(parsed.data.config);
      if (!cfg.success) {
        return reply.code(400).send({ success: false, error: "Invalid config" });
      }
      const updated = await prisma.device.update({
        where: { id: deviceId },
        data: { config: cfg.data },
        include: { capabilities: true, room: true, lighting: true },
      });
      await audit(req.user.sub, "device.config_updated", "Device", deviceId, {
        homeId,
        config: cfg.data,
      });
      return { success: true, data: mapDeviceForUi(updated, await latestMetrics(deviceId)) };
    }
  );

  app.get(
    "/v1/homes/:homeId/devices/:deviceId/telemetry",
    { preHandler: authenticate },
    async (req, reply) => {
      const { homeId, deviceId } = req.params as { homeId: string; deviceId: string };
      if (!(await requireHomeRole(req.user.sub, homeId))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      const q = req.query as { from?: string; to?: string; limit?: string };
      const take = Math.min(Number(q.limit ?? 200), 500);
      const rows = await prisma.telemetryReading.findMany({
        where: {
          homeId,
          deviceId,
          recordedAt: {
            gte: q.from ? new Date(q.from) : new Date(Date.now() - 24 * 3600_000),
            lte: q.to ? new Date(q.to) : new Date(),
          },
        },
        orderBy: { recordedAt: "desc" },
        take,
      });
      return {
        success: true,
        data: rows.map((r) => ({
          deviceId: r.deviceId,
          homeId: r.homeId,
          timestamp: r.recordedAt.toISOString(),
          metrics: r.metrics,
        })),
      };
    }
  );

  app.get("/v1/homes/:homeId/telemetry", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const q = req.query as { from?: string; to?: string; deviceId?: string; roomId?: string; limit?: string };
    const take = Math.min(Number(q.limit ?? 200), 500);
    const deviceFilter = q.roomId
      ? { roomId: q.roomId, ...(q.deviceId ? { id: q.deviceId } : {}) }
      : q.deviceId
        ? { id: q.deviceId }
        : {};
    const rows = await prisma.telemetryReading.findMany({
      where: {
        homeId,
        recordedAt: {
          gte: q.from ? new Date(q.from) : new Date(Date.now() - 24 * 3600_000),
          lte: q.to ? new Date(q.to) : new Date(),
        },
        device: Object.keys(deviceFilter).length ? deviceFilter : undefined,
      },
      orderBy: { recordedAt: "desc" },
      take,
    });
    return {
      success: true,
      data: rows.map((r) => ({
        deviceId: r.deviceId,
        homeId: r.homeId,
        timestamp: r.recordedAt.toISOString(),
        metrics: r.metrics,
      })),
    };
  });

  app.get("/v1/homes/:homeId/energy", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const period = ((req.query as { period?: string }).period ?? "day") as "day" | "week" | "month";
    const now = new Date();
    const window = periodWindow(period === "week" || period === "month" ? period : "day", now);
    const tariff = await prisma.utilityConfig.findUnique({ where: { homeId } });
    const rate = Number(tariff?.electricityTariffPerKwh ?? 0);
    const todayStart = startOfUtcDay();
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const consumption = await sumDeltaMetric(homeId, "energy_kwh_delta", window.start, window.end);
    const todayKwh = await sumDeltaMetric(homeId, "energy_kwh_delta", todayStart, new Date());
    const yesterdayKwh = await sumDeltaMetric(homeId, "energy_kwh_delta", yesterdayStart, todayStart);
    const { peak, average } = await powerStats(homeId, window.start, window.end);
    const comparisonPercent =
      yesterdayKwh > 0 ? Math.round((Math.abs(todayKwh - yesterdayKwh) / yesterdayKwh) * 100) : 0;
    const history = [];
    if (period === "week" || period === "month") {
      const cursor = new Date(window.start);
      while (cursor < window.end && cursor < now) {
        const end = new Date(cursor);
        end.setUTCDate(end.getUTCDate() + 1);
        history.push({
          label: cursor.toISOString().slice(5, 10),
          value: Number((await sumDeltaMetric(homeId, "energy_kwh_delta", cursor, end)).toFixed(2)),
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    } else {
      for (const d of dayLabels()) {
        const end = new Date(d.start);
        end.setUTCDate(end.getUTCDate() + 1);
        history.push({
          label: d.label,
          value: Number((await sumDeltaMetric(homeId, "energy_kwh_delta", d.start, end)).toFixed(2)),
        });
      }
    }
    const latest = await prisma.telemetryReading.findFirst({
      where: { homeId, device: { type: "energy_meter" } },
      orderBy: { recordedAt: "desc" },
    });
    const metrics = (latest?.metrics as Record<string, number> | undefined) ?? {};
    return {
      success: true,
      data: {
        homeId,
        period,
        todayKwh: Number(todayKwh.toFixed(2)),
        consumption: Number(consumption.toFixed(2)),
        estimatedCost: Math.round(consumption * rate),
        comparisonPercent,
        comparisonDirection: todayKwh >= yesterdayKwh ? "up" : "down",
        history,
        series: history,
        current: {
          voltage: metrics.voltage,
          current: metrics.current,
          power: metrics.power,
          energy_kwh: metrics.energy_kwh,
          frequency: metrics.frequency,
          power_factor: metrics.power_factor,
        },
        tariffPerKwh: rate,
        currency: tariff?.currency ?? "IDR",
        peak,
        average,
      },
    };
  });

  app.get("/v1/homes/:homeId/water", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const period = ((req.query as { period?: string }).period ?? "day") as "day" | "week" | "month";
    const now = new Date();
    const window = periodWindow(period === "week" || period === "month" ? period : "day", now);
    const tariff = await prisma.utilityConfig.findUnique({ where: { homeId } });
    const rateM3 = Number(tariff?.waterTariffPerM3 ?? 0);
    const todayStart = startOfUtcDay();
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const consumption = await sumDeltaMetric(homeId, "volume_liters_delta", window.start, window.end);
    const todayLiters = await sumDeltaMetric(homeId, "volume_liters_delta", todayStart, new Date());
    const yesterday = await sumDeltaMetric(homeId, "volume_liters_delta", yesterdayStart, todayStart);
    const comparisonPercent =
      yesterday > 0 ? Math.round((Math.abs(todayLiters - yesterday) / yesterday) * 100) : 0;
    const history = [];
    if (period === "week" || period === "month") {
      const cursor = new Date(window.start);
      while (cursor < window.end && cursor < now) {
        const end = new Date(cursor);
        end.setUTCDate(end.getUTCDate() + 1);
        history.push({
          label: cursor.toISOString().slice(5, 10),
          value: Math.round(await sumDeltaMetric(homeId, "volume_liters_delta", cursor, end)),
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    } else {
      for (const d of dayLabels()) {
        const end = new Date(d.start);
        end.setUTCDate(end.getUTCDate() + 1);
        history.push({
          label: d.label,
          value: Math.round(await sumDeltaMetric(homeId, "volume_liters_delta", d.start, end)),
        });
      }
    }
    const latest = await prisma.telemetryReading.findFirst({
      where: { homeId, device: { type: "water_meter" } },
      orderBy: { recordedAt: "desc" },
    });
    const metrics = (latest?.metrics as Record<string, number> | undefined) ?? {};
    const flowRows = await prisma.telemetryAggregate.findMany({
      where: { homeId, metric: "flow_lpm", period: "hour", periodStart: { gte: window.start, lt: window.end } },
    });
    const peak = flowRows.length ? Math.max(...flowRows.map((r) => r.max)) : Number(metrics.flow_lpm ?? 0);
    const average = flowRows.length
      ? flowRows.reduce((a, r) => a + r.avg * r.sampleCount, 0) / Math.max(1, flowRows.reduce((a, r) => a + r.sampleCount, 0))
      : Number(metrics.flow_lpm ?? 0);
    return {
      success: true,
      data: {
        homeId,
        period,
        todayLiters: Math.round(todayLiters),
        consumption: Math.round(consumption),
        estimatedCost: Math.round((consumption / 1000) * rateM3),
        comparisonPercent,
        comparisonDirection: todayLiters >= yesterday ? "up" : "down",
        history,
        series: history,
        current: { flow_lpm: metrics.flow_lpm, volume_liters: metrics.volume_liters },
        tariffPerM3: rateM3,
        currency: tariff?.currency ?? "IDR",
        peak,
        average,
      },
    };
  });

  app.get("/v1/homes/:homeId/environment", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const latest = await prisma.telemetryReading.findFirst({
      where: { homeId, device: { type: "environment_sensor" } },
      orderBy: { recordedAt: "desc" },
    });
    const metrics = (latest?.metrics as Record<string, number> | undefined) ?? {};
    return {
      success: true,
      data: {
        homeId,
        temperature: metrics.temperature_c ?? 0,
        humidity: metrics.humidity_pct ?? 0,
        airQuality: "good" as const,
      },
    };
  });

  app.get("/v1/homes/:homeId/dashboard", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const [energyRes, waterRes, envRes, devices] = await Promise.all([
      (async () => {
        const fake = { user: req.user };
        return fake;
      })(),
      Promise.resolve(null),
      Promise.resolve(null),
      prisma.device.findMany({
        where: { homeId },
        include: { capabilities: true, room: true, lighting: true },
      }),
    ]);
    void energyRes;
    void waterRes;
    void envRes;

    const online = devices.filter((d) => d.status === "online").length;
    const offline = devices.filter((d) => d.status === "offline").length;
    const featured = [];
    for (const d of devices.slice(0, 3)) {
      featured.push(mapDeviceForUi(d, await latestMetrics(d.id)));
    }

    const energy = (await app.inject({
      method: "GET",
      url: `/v1/homes/${homeId}/energy`,
      headers: { authorization: req.headers.authorization },
    })).json();
    const water = (await app.inject({
      method: "GET",
      url: `/v1/homes/${homeId}/water`,
      headers: { authorization: req.headers.authorization },
    })).json();
    const environment = (await app.inject({
      method: "GET",
      url: `/v1/homes/${homeId}/environment`,
      headers: { authorization: req.headers.authorization },
    })).json();

    const activity = await prisma.command.findMany({
      where: { homeId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { device: true },
    });

    return {
      success: true,
      data: {
        homeStatus: offline > 0 ? "devices_offline" : "normal",
        statusMessage: offline > 0 ? `${offline} perangkat offline` : "Semua terlihat baik",
        energy: energy.data,
        water: water.data,
        environment: environment.data,
        aiInsight: {
          id: "ai-live",
          homeId,
          title: "Monitoring aktif",
          message:
            "Data energi dan air berasal dari simulator MQTT (bukan hardware fisik).",
          ctaLabel: "Lihat perangkat",
          ctaUrl: "/devices",
          createdAt: new Date().toISOString(),
          category: "info",
          severity: "info",
        },
        devicesOnline: online,
        devicesOffline: offline,
        featuredDevices: featured,
        recentActivity: activity.map((c) => ({
          id: c.id,
          homeId,
          message: `${c.device.name}: ${c.type} (${c.status})`,
          deviceName: c.device.name,
          timestamp: c.createdAt.toISOString(),
          type: "device" as const,
        })),
      },
    };
  });

  app.post(
    "/v1/homes/:homeId/devices/:deviceId/commands",
    { preHandler: authenticate, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { homeId, deviceId } = req.params as { homeId: string; deviceId: string };
      if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      const parsed = createCommandBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Invalid payload" });
      }
      try {
        const cmd = await createCommand({
          homeId,
          deviceId,
          type: parsed.data.type,
          params: parsed.data.params ?? {},
          idempotencyKey: parsed.data.idempotencyKey,
          createdById: req.user.sub,
        });
        return { success: true, data: cmd };
      } catch (e) {
        const err = e as { statusCode?: number; message: string };
        return reply.code(err.statusCode ?? 500).send({ success: false, error: err.message });
      }
    }
  );

  app.get("/v1/homes/:homeId/commands", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const rows = await prisma.command.findMany({
      where: { homeId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { success: true, data: rows };
  });

  app.get("/v1/homes/:homeId/automations", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const rules = await prisma.automationRule.findMany({ where: { homeId } });
    return { success: true, data: rules };
  });

  app.post("/v1/homes/:homeId/automations", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const parsed = createAutomationBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    const rule = await prisma.automationRule.create({
      data: {
        homeId,
        name: parsed.data.name,
        enabled: parsed.data.enabled,
        trigger: parsed.data.trigger as object,
        conditions: parsed.data.conditions as object[],
        actions: parsed.data.actions as object[],
        icon: parsed.data.icon,
      },
    });
    return { success: true, data: rule };
  });

  app.patch(
    "/v1/homes/:homeId/automations/:ruleId",
    { preHandler: authenticate },
    async (req, reply) => {
      const { homeId, ruleId } = req.params as { homeId: string; ruleId: string };
      if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      const body = req.body as { enabled?: boolean };
      const rule = await prisma.automationRule.updateMany({
        where: { id: ruleId, homeId },
        data: { enabled: body.enabled },
      });
      if (rule.count === 0) return reply.code(404).send({ success: false, error: "Not found" });
      const updated = await prisma.automationRule.findUnique({ where: { id: ruleId } });
      return { success: true, data: updated };
    }
  );

  app.delete(
    "/v1/homes/:homeId/automations/:ruleId",
    { preHandler: authenticate },
    async (req, reply) => {
      const { homeId, ruleId } = req.params as { homeId: string; ruleId: string };
      if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      await prisma.automationRule.deleteMany({ where: { id: ruleId, homeId } });
      return { success: true, data: { deleted: true } };
    }
  );

  app.get(
    "/v1/homes/:homeId/automations/:ruleId/executions",
    { preHandler: authenticate },
    async (req, reply) => {
      const { homeId, ruleId } = req.params as { homeId: string; ruleId: string };
      if (!(await requireHomeRole(req.user.sub, homeId))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      const rows = await prisma.automationExecution.findMany({
        where: { ruleId, rule: { homeId } },
        orderBy: { triggeredAt: "desc" },
        take: 50,
      });
      return { success: true, data: rows };
    }
  );

  app.get("/v1/homes/:homeId/alerts", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const rows = await prisma.alert.findMany({
      where: { homeId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { success: true, data: rows };
  });

  app.post("/v1/homes/:homeId/alerts/:alertId/ack", { preHandler: authenticate }, async (req, reply) => {
    const { homeId, alertId } = req.params as { homeId: string; alertId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const alert = await prisma.alert.findFirst({ where: { id: alertId, homeId } });
    if (!alert) return reply.code(404).send({ success: false, error: "Alert not found" });
    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: { status: "acknowledged", acknowledgedById: req.user.sub, acknowledgedAt: new Date() },
    });
    await audit(req.user.sub, "alert.acknowledged", "Alert", alertId, { homeId });
    return { success: true, data: updated };
  });

  app.get("/v1/homes/:homeId/alert-thresholds", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "ADMIN"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const rows = await prisma.alertThreshold.findMany({ where: { homeId } });
    return { success: true, data: rows };
  });

  app.post("/v1/homes/:homeId/alert-thresholds", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "ADMIN"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const body = req.body as {
      type: "HIGH_ELECTRICITY" | "ABNORMAL_WATER" | "POSSIBLE_LEAK" | "DEVICE_OFFLINE" | "SENSOR_ERROR";
      metric: string;
      op: string;
      value: number;
      forSeconds?: number;
      severity: "info" | "warning" | "critical";
      enabled?: boolean;
    };
    if (!body?.type || !body.metric || !body.op || typeof body.value !== "number") {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    const row = await prisma.alertThreshold.create({
      data: {
        homeId,
        type: body.type,
        metric: body.metric,
        op: body.op,
        value: body.value,
        forSeconds: body.forSeconds ?? 0,
        severity: body.severity,
        enabled: body.enabled ?? true,
      },
    });
    await audit(req.user.sub, "alert_threshold.created", "AlertThreshold", row.id, { homeId });
    return { success: true, data: row };
  });

  app.patch("/v1/homes/:homeId/alert-thresholds/:id", { preHandler: authenticate }, async (req, reply) => {
    const { homeId, id } = req.params as { homeId: string; id: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "ADMIN"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const existing = await prisma.alertThreshold.findFirst({ where: { id, homeId } });
    if (!existing) return reply.code(404).send({ success: false, error: "Not found" });
    const body = req.body as Partial<{
      op: string;
      value: number;
      forSeconds: number;
      severity: "info" | "warning" | "critical";
      enabled: boolean;
      metric: string;
    }>;
    const row = await prisma.alertThreshold.update({
      where: { id },
      data: {
        op: body.op ?? existing.op,
        value: body.value ?? existing.value,
        forSeconds: body.forSeconds ?? existing.forSeconds,
        severity: body.severity ?? existing.severity,
        enabled: body.enabled ?? existing.enabled,
        metric: body.metric ?? existing.metric,
      },
    });
    await audit(req.user.sub, "alert_threshold.updated", "AlertThreshold", id, { homeId });
    return { success: true, data: row };
  });

  app.delete("/v1/homes/:homeId/alert-thresholds/:id", { preHandler: authenticate }, async (req, reply) => {
    const { homeId, id } = req.params as { homeId: string; id: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "ADMIN"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    await prisma.alertThreshold.deleteMany({ where: { id, homeId } });
    await audit(req.user.sub, "alert_threshold.deleted", "AlertThreshold", id, { homeId });
    return { success: true, data: { deleted: true } };
  });

  app.get("/v1/homes/:homeId/events", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : "*";
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    });
    const send = (evt: AppEvent) => {
      reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`);
    };
    const listener = (evt: AppEvent) => send(evt);
    hub.on(`home:${homeId}`, listener);
    req.raw.on("close", () => hub.off(`home:${homeId}`, listener));
  });

  // Internal ingest (gateway)
  app.post("/internal/telemetry", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const body = req.body as {
      homeId: string;
      deviceId: string;
      payload: unknown;
      source?: "telemetry" | "state";
    };
    const parsed = telemetryPayloadSchema.safeParse(body.payload);
    if (!parsed.success) {
      req.log.warn({ msg: "Telemetry rejected", issues: parsed.error.flatten() });
      return reply.code(400).send({ success: false, error: "invalid_telemetry" });
    }
    const result = await ingestTelemetry({
      homeId: body.homeId,
      deviceId: body.deviceId,
      recordedAt: new Date(parsed.data.ts),
      metrics: parsed.data.metrics,
      source: body.source === "state" ? "state" : "telemetry",
    });
    if (!result.ok) return reply.code(404).send({ success: false, error: result.error });
    req.log.info({ msg: "Telemetry received", deviceId: body.deviceId });
    return { success: true, data: { id: result.id } };
  });

  app.post("/internal/event", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const body = req.body as { homeId: string; deviceId: string; payload: unknown };
    const parsed = eventPayloadSchema.safeParse(body.payload);
    if (!parsed.success) {
      req.log.warn({ msg: "Event rejected", issues: parsed.error.flatten() });
      return reply.code(400).send({ success: false, error: "invalid_event" });
    }
    const result = await ingestDeviceEvent({
      homeId: body.homeId,
      deviceId: body.deviceId,
      ts: new Date(parsed.data.ts),
      event: parsed.data.event,
      data: parsed.data.data,
    });
    if (!result.ok) return reply.code(404).send({ success: false, error: result.error });
    return { success: true };
  });

  app.post("/internal/availability", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const body = req.body as { homeId: string; nodeId: string; payload: unknown };
    const parsed = availabilityPayloadSchema.safeParse(body.payload);
    if (!parsed.success) {
      req.log.warn({ msg: "Availability rejected", issues: parsed.error.flatten() });
      return reply.code(400).send({ success: false, error: "invalid_availability" });
    }
    const result = await applyNodeAvailability({
      homeId: body.homeId,
      nodeId: body.nodeId,
      status: parsed.data.status,
      ip: parsed.data.ip,
      firmware: parsed.data.firmware,
      rssi: parsed.data.rssi,
    });
    if (!result.ok) return reply.code(404).send({ success: false, error: result.error });
    return { success: true, data: { deviceCount: result.deviceCount } };
  });

  app.post("/internal/status", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const body = req.body as { homeId: string; deviceId: string; payload: unknown };
    const parsed = deviceStatusPayloadSchema.safeParse(body.payload);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "invalid_status" });
    }
    await applyDeviceStatus({
      homeId: body.homeId,
      deviceId: body.deviceId,
      ...parsed.data,
    });
    return { success: true };
  });

  app.post("/internal/ack", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const parsed = ackPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "invalid_ack" });
    }
    const cmd = await prisma.command.findUnique({ where: { id: parsed.data.commandId } });
    if (!cmd) return reply.code(404).send({ success: false, error: "unknown_command" });
    await prisma.commandAcknowledgement.create({
      data: { commandId: cmd.id, payload: parsed.data },
    });
    const status = parsed.data.status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED";
    await prisma.command.update({
      where: { id: cmd.id },
      data: {
        status,
        acknowledgedAt: new Date(),
        completedAt: new Date(),
        error: parsed.data.error ?? null,
      },
    });
    if (cmd.type === "TURN_ON" || cmd.type === "TURN_OFF") {
      const on = cmd.type === "TURN_ON";
      await prisma.device.update({ where: { id: cmd.deviceId }, data: { isOn: on } });
      await prisma.lightingState.upsert({
        where: { deviceId: cmd.deviceId },
        update: { isOn: on },
        create: { deviceId: cmd.deviceId, isOn: on },
      });
    }
    req.log.info({ msg: "Command acknowledged", commandId: cmd.id, status });
    hub.publish({
      event: "COMMAND_UPDATED",
      homeId: cmd.homeId,
      deviceId: cmd.deviceId,
      data: { commandId: cmd.id, status },
      ts: new Date().toISOString(),
    });
    return { success: true };
  });

  app.get("/internal/commands/pending", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const rows = await prisma.command.findMany({
      where: { status: "PENDING" },
      take: 20,
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: rows };
  });

  app.post("/internal/commands/:id/sent", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const { id } = req.params as { id: string };
    await prisma.command.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
    req.log.info({ msg: "Command sent", commandId: id });
    return { success: true };
  });

  app.get("/internal/automations", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const since = (req.query as { since?: string }).since;
    const where = since ? { updatedAt: { gt: new Date(since) } } : {};
    const rules = await prisma.automationRule.findMany({
      where,
      orderBy: { updatedAt: "asc" },
    });
    const cursor =
      rules.length > 0
        ? rules[rules.length - 1].updatedAt.toISOString()
        : (since ?? new Date().toISOString());
    return { success: true, data: rules, cursor };
  });

  app.post("/internal/telemetry/batch", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const items = (req.body as { items?: Array<{
      homeId: string;
      deviceId: string;
      source?: "telemetry" | "state";
      payload: unknown;
    }> }).items ?? [];
    let accepted = 0;
    for (const item of items.slice(0, 500)) {
      const parsed = telemetryPayloadSchema.safeParse(item.payload);
      if (!parsed.success) continue;
      const result = await ingestTelemetry({
        homeId: item.homeId,
        deviceId: item.deviceId,
        recordedAt: new Date(parsed.data.ts),
        metrics: parsed.data.metrics,
        source: item.source === "state" ? "state" : "telemetry",
      });
      if (result.ok) accepted += 1;
    }
    return { success: true, data: { accepted } };
  });

  app.post("/internal/events/batch", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const items = (req.body as { items?: Array<{
      homeId: string;
      deviceId: string;
      payload: unknown;
    }> }).items ?? [];
    let accepted = 0;
    for (const item of items.slice(0, 500)) {
      const parsed = eventPayloadSchema.safeParse(item.payload);
      if (!parsed.success) continue;
      const result = await ingestDeviceEvent({
        homeId: item.homeId,
        deviceId: item.deviceId,
        ts: new Date(parsed.data.ts),
        event: parsed.data.event,
        data: parsed.data.data,
      });
      if (result.ok) accepted += 1;
    }
    return { success: true, data: { accepted } };
  });

  app.post("/internal/commands/reconcile", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const items = (req.body as { items?: Array<{
      id: string;
      homeId: string;
      deviceId: string;
      type: string;
      params?: Record<string, unknown>;
      idempotencyKey: string;
      status?: string;
    }> }).items ?? [];
    let accepted = 0;
    for (const item of items.slice(0, 500)) {
      const existing = await prisma.command.findUnique({ where: { id: item.id } });
      if (existing) {
        accepted += 1;
        continue;
      }
      const byKey = await prisma.command.findUnique({
        where: { homeId_idempotencyKey: { homeId: item.homeId, idempotencyKey: item.idempotencyKey } },
      });
      if (byKey) {
        accepted += 1;
        continue;
      }
      await prisma.command.create({
        data: {
          id: item.id,
          homeId: item.homeId,
          deviceId: item.deviceId,
          type: item.type,
          params: (item.params ?? {}) as Prisma.InputJsonValue,
          idempotencyKey: item.idempotencyKey,
          status: "SENT",
          sentAt: new Date(),
        },
      });
      accepted += 1;
    }
    return { success: true, data: { accepted } };
  });

  app.post("/internal/alerts", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const items = (req.body as { items?: Array<{
      id?: string;
      homeId: string;
      deviceId?: string;
      roomId?: string;
      severity: "info" | "warning" | "critical";
      type: "HIGH_ELECTRICITY" | "ABNORMAL_WATER" | "POSSIBLE_LEAK" | "DEVICE_OFFLINE" | "SENSOR_ERROR";
      title: string;
      message: string;
      status?: "open" | "acknowledged" | "resolved";
    }> }).items ?? [];
    for (const item of items) {
      if (item.id) {
        await prisma.alert.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            homeId: item.homeId,
            deviceId: item.deviceId,
            roomId: item.roomId,
            severity: item.severity,
            type: item.type,
            title: item.title,
            message: item.message,
            status: item.status ?? "open",
          },
          update: {
            status: item.status ?? "open",
            message: item.message,
          },
        });
      } else {
        await prisma.alert.create({
          data: {
            homeId: item.homeId,
            deviceId: item.deviceId,
            roomId: item.roomId,
            severity: item.severity,
            type: item.type,
            title: item.title,
            message: item.message,
            status: item.status ?? "open",
          },
        });
      }
    }
    return { success: true };
  });

  app.get("/internal/alert-thresholds", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const rows = await prisma.alertThreshold.findMany({ where: { enabled: true } });
    return { success: true, data: rows };
  });

  app.post("/internal/automation-executions", async (req, reply) => {
    requireInternalKey(req, reply);
    if (reply.sent) return;
    const items = (req.body as { items?: Array<{
      ruleId: string;
      status: string;
      result?: object;
    }> }).items ?? [];
    for (const item of items) {
      await prisma.automationExecution.create({ data: item });
    }
    return { success: true };
  });

  // ─── Commerce: in-building marketplace / kiosk ─────────────────────────────

  // Vendor + its home/items, mapped to the shape the web `Order` type expects
  // (plus routing fields the kiosk view needs).
  type OrderWithRelations = Prisma.OrderGetPayload<{
    include: {
      vendor: true;
      items: true;
      home: { select: { name: true; floor: { select: { name: true } } } };
    };
  }>;
  function mapOrder(o: OrderWithRelations) {
    return {
      id: o.id,
      title: o.vendor.name,
      kind: "service" as const,
      items: o.items.map((it) => ({
        id: it.id,
        name: it.name,
        price: it.priceIdr,
        qty: it.qty,
        emoji: it.emoji,
        meta: o.vendor.name,
      })),
      total: o.totalIdr,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      vendor: o.vendor.name,
      eta: "±20 menit",
      // kiosk routing / payment context
      homeId: o.homeId,
      unit: o.home.name,
      floor: o.home.floor?.name ?? null,
      paymentChannel: o.paymentChannel,
      paymentStatus: o.paymentStatus,
    };
  }
  const ORDER_INCLUDE = {
    vendor: true,
    items: true,
    home: { select: { name: true, floor: { select: { name: true } } } },
  } as const;

  // A kiosk is operated by anyone who is a member of a home in its building.
  async function canOperateVendor(userId: string, vendorId: string): Promise<boolean> {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return false;
    const m = await prisma.membership.findFirst({
      where: { userId, home: { buildingId: vendor.buildingId } },
    });
    return Boolean(m);
  }

  // Catalog available to a unit = active vendors in that unit's building.
  app.get("/v1/homes/:homeId/marketplace", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const home = await prisma.home.findUnique({ where: { id: homeId }, select: { buildingId: true } });
    if (!home?.buildingId) {
      return { success: true, data: { vendors: [], products: [], categories: [{ id: "all", label: "Semua" }] } };
    }
    const vendors = await prisma.vendor.findMany({
      where: { buildingId: home.buildingId, active: true },
      include: { products: { where: { available: true }, orderBy: { name: "asc" } } },
    });
    const products = vendors.flatMap((v) =>
      v.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.priceIdr,
        category: p.category,
        emoji: p.emoji,
        description: p.description,
        kind: "goods" as const,
        unit: p.unit ?? undefined,
        vendor: `${v.name} · ${v.floorLabel}`,
        vendorId: v.id,
        eta: `±${p.etaMinutes} menit`,
      }))
    );
    const categories = [
      { id: "all", label: "Semua" },
      ...Array.from(new Set(products.map((p) => p.category))).map((c) => ({ id: c, label: c })),
    ];
    return {
      success: true,
      data: {
        vendors: vendors.map((v) => ({ id: v.id, name: v.name, floorLabel: v.floorLabel, emoji: v.emoji })),
        products,
        categories,
      },
    };
  });

  app.get("/v1/homes/:homeId/orders", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const orders = await prisma.order.findMany({
      where: { homeId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { success: true, data: orders.map(mapOrder) };
  });

  app.post("/v1/homes/:homeId/orders", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const parsed = createOrderBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    const { vendorId, items, paymentChannel, note } = parsed.data;
    const home = await prisma.home.findUnique({ where: { id: homeId }, select: { buildingId: true } });
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor || !home?.buildingId || vendor.buildingId !== home.buildingId) {
      return reply.code(400).send({ success: false, error: "Kios tidak melayani gedung ini." });
    }
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, vendorId, available: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    if (products.length !== new Set(productIds).size) {
      return reply.code(400).send({ success: false, error: "Sebagian produk tidak tersedia." });
    }
    let total = 0;
    const itemData = items.map((i) => {
      const p = byId.get(i.productId)!;
      total += p.priceIdr * i.qty;
      return { productId: p.id, name: p.name, emoji: p.emoji, priceIdr: p.priceIdr, qty: i.qty };
    });
    // Simulated payment: cash settles on delivery (pending); everything else is
    // treated as paid immediately (QRIS/VA/etc. are demo-only, no real gateway).
    const paymentStatus = paymentChannel === "cash" ? "pending" : "paid";
    const order = await prisma.order.create({
      data: {
        homeId,
        vendorId,
        status: "confirmed",
        paymentChannel,
        paymentStatus,
        totalIdr: total,
        note: note ?? null,
        items: { create: itemData },
      },
      include: ORDER_INCLUDE,
    });
    const mapped = mapOrder(order);
    hub.publish({ event: "order.created", homeId, data: { order: mapped }, ts: new Date().toISOString() });
    await audit(req.user.sub, "order.create", "Order", order.id, { vendorId, total });
    return { success: true, data: mapped };
  });

  // Kiosk view: orders addressed to a vendor.
  app.get("/v1/vendors/:vendorId/orders", { preHandler: authenticate }, async (req, reply) => {
    const { vendorId } = req.params as { vendorId: string };
    if (!(await canOperateVendor(req.user.sub, vendorId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const { active } = req.query as { active?: string };
    const orders = await prisma.order.findMany({
      where: {
        vendorId,
        ...(active === "1" ? { status: { in: ["confirmed", "preparing", "delivering"] } } : {}),
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { success: true, data: orders.map(mapOrder) };
  });

  app.patch("/v1/orders/:orderId/status", { preHandler: authenticate }, async (req, reply) => {
    const { orderId } = req.params as { orderId: string };
    const parsed = updateOrderStatusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) return reply.code(404).send({ success: false, error: "Order not found" });
    if (!(await canOperateVendor(req.user.sub, existing.vendorId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    // Cash is collected on delivery; mark it paid once completed.
    const paymentStatus =
      parsed.data.status === "completed" && existing.paymentChannel === "cash"
        ? "paid"
        : existing.paymentStatus;
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: parsed.data.status, paymentStatus },
      include: ORDER_INCLUDE,
    });
    const mapped = mapOrder(order);
    hub.publish({ event: "order.updated", homeId: order.homeId, data: { order: mapped }, ts: new Date().toISOString() });
    return { success: true, data: mapped };
  });

  // ─── Prepaid utility wallet (opt-in per unit) ──────────────────────────────

  app.get("/v1/homes/:homeId/prepaid", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "VIEWER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const status = await getPrepaidStatus(homeId);
    return { success: true, data: status };
  });

  app.post("/v1/homes/:homeId/prepaid/config", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const parsed = prepaidConfigBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    // Validate any device targets belong to this unit and are actuators.
    for (const key of ["electricityRelayDeviceId", "waterValveDeviceId"] as const) {
      const id = parsed.data[key];
      if (id) {
        const device = await prisma.device.findFirst({
          where: { id, homeId },
          include: { capabilities: true },
        });
        if (!device || !device.capabilities.some((c) => c.capability === "on_off")) {
          return reply.code(400).send({ success: false, error: `Perangkat pemutus (${key}) tidak valid.` });
        }
      }
    }
    await prisma.prepaidAccount.upsert({
      where: { homeId },
      update: {
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
        ...(parsed.data.lowBalanceThresholdIdr !== undefined
          ? { lowBalanceThresholdIdr: parsed.data.lowBalanceThresholdIdr }
          : {}),
        ...(parsed.data.electricityRelayDeviceId !== undefined
          ? { electricityRelayDeviceId: parsed.data.electricityRelayDeviceId }
          : {}),
        ...(parsed.data.waterValveDeviceId !== undefined
          ? { waterValveDeviceId: parsed.data.waterValveDeviceId }
          : {}),
      },
      create: {
        homeId,
        enabled: parsed.data.enabled ?? false,
        lowBalanceThresholdIdr: parsed.data.lowBalanceThresholdIdr ?? 20000,
        electricityRelayDeviceId: parsed.data.electricityRelayDeviceId ?? null,
        waterValveDeviceId: parsed.data.waterValveDeviceId ?? null,
      },
    });
    await audit(req.user.sub, "prepaid.config", "PrepaidAccount", homeId, parsed.data);
    const status = await getPrepaidStatus(homeId);
    return { success: true, data: status };
  });

  app.post("/v1/homes/:homeId/prepaid/topup", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const parsed = prepaidTopupBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    try {
      // Simulated payment: the top-up settles immediately (QRIS/VA/etc. are
      // demo-only, no real gateway), then credits the wallet.
      await topupPrepaid(homeId, parsed.data.amountIdr, {
        paymentChannel: parsed.data.paymentChannel,
      });
      await audit(req.user.sub, "prepaid.topup", "PrepaidAccount", homeId, {
        amountIdr: parsed.data.amountIdr,
      });
      const status = await getPrepaidStatus(homeId);
      return { success: true, data: status };
    } catch (e) {
      const err = e as { statusCode?: number; message: string };
      return reply.code(err.statusCode ?? 500).send({ success: false, error: err.message });
    }
  });

  // ─── Billing: resident invoices ────────────────────────────────────────────

  app.get("/v1/homes/:homeId/invoices", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "VIEWER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    return { success: true, data: await listInvoices(homeId) };
  });

  app.post(
    "/v1/homes/:homeId/invoices/:invoiceId/pay",
    { preHandler: authenticate },
    async (req, reply) => {
      const { homeId, invoiceId } = req.params as { homeId: string; invoiceId: string };
      if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      const parsed = payInvoiceBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Invalid payload" });
      }
      const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, homeId } });
      if (!inv) return reply.code(404).send({ success: false, error: "Invoice not found" });
      // Simulated payment settles immediately (no real gateway).
      const paid = await payInvoice(invoiceId, parsed.data.paymentChannel);
      await audit(req.user.sub, "invoice.pay", "Invoice", invoiceId, { homeId });
      return { success: true, data: paid };
    }
  );

  // ─── Billing: building-manager console ─────────────────────────────────────

  app.get("/v1/buildings/:buildingId/units", { preHandler: authenticate }, async (req, reply) => {
    const { buildingId } = req.params as { buildingId: string };
    if (!(await canManageBuilding(req.user.sub, buildingId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    return { success: true, data: await listBuildingUnits(buildingId) };
  });

  app.post(
    "/v1/buildings/:buildingId/invoices/generate",
    { preHandler: authenticate },
    async (req, reply) => {
      const { buildingId } = req.params as { buildingId: string };
      if (!(await canManageBuilding(req.user.sub, buildingId))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      const parsed = generateInvoiceBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Invalid payload" });
      }
      const period = parsePeriod(parsed.data.period);
      const invoices = await generateBuildingInvoices(buildingId, period);
      await audit(req.user.sub, "invoice.generate", "Building", buildingId, {
        period: parsed.data.period ?? "current",
        count: invoices.length,
      });
      return { success: true, data: invoices };
    }
  );

  app.post(
    "/v1/homes/:homeId/invoices/generate",
    { preHandler: authenticate },
    async (req, reply) => {
      const { homeId } = req.params as { homeId: string };
      if (!(await requireHomeRole(req.user.sub, homeId, "ADMIN"))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      const parsed = generateInvoiceBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Invalid payload" });
      }
      const period = parsed.data.period ? parsePeriod(parsed.data.period) : monthStart();
      const invoice = await generateInvoiceForHome(homeId, period);
      await audit(req.user.sub, "invoice.generate", "Home", homeId, { period: parsed.data.period ?? "current" });
      return { success: true, data: invoice };
    }
  );

  // ─── Access control: guest passes, logs, unlock ────────────────────────────

  app.get("/v1/homes/:homeId/access-passes", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "VIEWER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    return { success: true, data: await listPasses(homeId) };
  });

  app.post("/v1/homes/:homeId/access-passes", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const parsed = createPassBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    const pass = await createPass({ homeId, createdById: req.user.sub, ...parsed.data });
    await audit(req.user.sub, "access.pass.create", "AccessPass", pass.id, { homeId, kind: pass.kind });
    return { success: true, data: pass };
  });

  app.post(
    "/v1/homes/:homeId/access-passes/:id/revoke",
    { preHandler: authenticate },
    async (req, reply) => {
      const { homeId, id } = req.params as { homeId: string; id: string };
      if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
      try {
        const pass = await revokePass(homeId, id);
        return { success: true, data: pass };
      } catch (e) {
        const err = e as { statusCode?: number; message: string };
        return reply.code(err.statusCode ?? 500).send({ success: false, error: err.message });
      }
    }
  );

  app.get("/v1/homes/:homeId/access-logs", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "VIEWER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    return { success: true, data: await listLogs(homeId) };
  });

  app.post("/v1/homes/:homeId/unlock", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "USER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    const res = await residentUnlock(homeId, user?.fullName ?? "Penghuni");
    if (!res.ok) return reply.code(400).send({ success: false, error: res.error });
    await audit(req.user.sub, "access.unlock", "Home", homeId);
    return { success: true, data: { ok: true } };
  });

  // Door-panel verification: a member scans/enters a code to open the lock.
  app.post("/v1/homes/:homeId/access/verify", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId, "VIEWER"))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const parsed = verifyAccessBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: "Invalid payload" });
    }
    const res = await verifyAndUnlock(homeId, parsed.data.code);
    return { success: true, data: res };
  });
}

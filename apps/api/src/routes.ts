import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@satu-atap/db";
import {
  DEFAULT_CAPABILITIES,
  createAutomationBodySchema,
  createCommandBodySchema,
  createDeviceBodySchema,
  loginBodySchema,
  ackPayloadSchema,
  telemetryPayloadSchema,
  eventPayloadSchema,
  availabilityPayloadSchema,
  deviceStatusPayloadSchema,
  type DeviceTypeId,
} from "@satu-atap/shared";
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

async function metricDelta(
  homeId: string,
  metric: string,
  from: Date,
  to: Date
): Promise<number> {
  const rows = await prisma.telemetryReading.findMany({
    where: { homeId, recordedAt: { gte: from, lt: to } },
    orderBy: { recordedAt: "asc" },
  });
  const values = rows
    .map((r) => (r.metrics as Record<string, unknown>)[metric])
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return 0;
  const last = values[values.length - 1];
  const first = values[0];
  const delta = last - first;
  return delta > 0 ? delta : last;
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
    const tariff = await prisma.utilityConfig.findUnique({ where: { homeId } });
    const rate = Number(tariff?.electricityTariffPerKwh ?? 0);
    const todayStart = startOfUtcDay();
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const todayKwh = await metricDelta(homeId, "energy_kwh", todayStart, new Date());
    const yesterdayKwh = await metricDelta(homeId, "energy_kwh", yesterdayStart, todayStart);
    const comparisonPercent =
      yesterdayKwh > 0 ? Math.round((Math.abs(todayKwh - yesterdayKwh) / yesterdayKwh) * 100) : 0;
    const history = [];
    for (const d of dayLabels()) {
      const end = new Date(d.start);
      end.setUTCDate(end.getUTCDate() + 1);
      history.push({
        label: d.label,
        value: Number((await metricDelta(homeId, "energy_kwh", d.start, end)).toFixed(2)),
      });
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
        todayKwh: Number(todayKwh.toFixed(2)),
        estimatedCost: Math.round(todayKwh * rate),
        comparisonPercent,
        comparisonDirection: todayKwh >= yesterdayKwh ? "up" : "down",
        history,
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
      },
    };
  });

  app.get("/v1/homes/:homeId/water", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    const tariff = await prisma.utilityConfig.findUnique({ where: { homeId } });
    const rateM3 = Number(tariff?.waterTariffPerM3 ?? 0);
    const todayStart = startOfUtcDay();
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const todayLiters = await metricDelta(homeId, "volume_liters", todayStart, new Date());
    const yesterday = await metricDelta(homeId, "volume_liters", yesterdayStart, todayStart);
    const comparisonPercent =
      yesterday > 0 ? Math.round((Math.abs(todayLiters - yesterday) / yesterday) * 100) : 0;
    const history = [];
    for (const d of dayLabels()) {
      const end = new Date(d.start);
      end.setUTCDate(end.getUTCDate() + 1);
      history.push({
        label: d.label,
        value: Math.round(await metricDelta(homeId, "volume_liters", d.start, end)),
      });
    }
    const latest = await prisma.telemetryReading.findFirst({
      where: { homeId, device: { type: "water_meter" } },
      orderBy: { recordedAt: "desc" },
    });
    const metrics = (latest?.metrics as Record<string, number> | undefined) ?? {};
    return {
      success: true,
      data: {
        homeId,
        todayLiters: Math.round(todayLiters),
        estimatedCost: Math.round((todayLiters / 1000) * rateM3),
        comparisonPercent,
        comparisonDirection: todayLiters >= yesterday ? "up" : "down",
        history,
        current: { flow_lpm: metrics.flow_lpm, volume_liters: metrics.volume_liters },
        tariffPerM3: rateM3,
        currency: tariff?.currency ?? "IDR",
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

  app.get("/v1/homes/:homeId/events", { preHandler: authenticate }, async (req, reply) => {
    const { homeId } = req.params as { homeId: string };
    if (!(await requireHomeRole(req.user.sub, homeId))) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
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
}

import { prisma, type Prisma } from "@satu-atap/db";
import {
  COUNTER_DELTA_CEILINGS,
  COUNTER_METRICS,
  INSTANT_METRICS,
  type CounterMetric,
} from "@satu-atap/shared";
import { evaluateAutomations } from "./automation.js";
import { hub } from "./events.js";

function hourStart(d: Date): Date {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x;
}

export function computeCounterDelta(
  previous: number | null,
  current: number,
  metric: CounterMetric
): { delta: number; warning?: string } {
  if (previous == null) return { delta: 0 };
  const delta = current - previous;
  if (delta < 0) {
    return {
      delta: 0,
      warning: "counter_reset",
    };
  }
  const ceiling = COUNTER_DELTA_CEILINGS[metric];
  if (delta > ceiling) {
    return { delta: 0, warning: "implausible_jump" };
  }
  return { delta };
}

async function enrichCounterDeltas(
  deviceId: string,
  metrics: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const enriched = { ...metrics };
  for (const metric of COUNTER_METRICS) {
    const current = metrics[metric];
    if (typeof current !== "number") continue;
    const snap = await prisma.deviceCounterSnapshot.findUnique({
      where: { deviceId_metric: { deviceId, metric } },
    });
    const previous = snap?.value ?? null;
    const { delta, warning } = computeCounterDelta(previous, current, metric);
    if (warning) {
      console.warn(
        JSON.stringify({
          msg: warning === "counter_reset" ? "Counter reset" : "Implausible counter jump",
          deviceId,
          metric,
          previous,
          current,
        })
      );
    }
    enriched[`${metric}_delta`] = delta;
    await prisma.deviceCounterSnapshot.upsert({
      where: { deviceId_metric: { deviceId, metric } },
      update: { value: current },
      create: { deviceId, metric, value: current },
    });
  }
  return enriched;
}

export async function ingestTelemetry(input: {
  homeId: string;
  deviceId: string;
  recordedAt: Date;
  metrics: Record<string, unknown>;
  source?: "telemetry" | "state";
}) {
  const device = await prisma.device.findFirst({
    where: { id: input.deviceId, homeId: input.homeId },
  });
  if (!device) return { ok: false as const, error: "unknown_device" };

  const metrics = await enrichCounterDeltas(input.deviceId, input.metrics);

  const reading = await prisma.telemetryReading.create({
    data: {
      homeId: input.homeId,
      deviceId: input.deviceId,
      recordedAt: input.recordedAt,
      metrics: metrics as Prisma.InputJsonValue,
    },
  });

  if (typeof metrics.motion === "boolean") {
    await prisma.motionEvent.create({
      data: {
        homeId: input.homeId,
        deviceId: input.deviceId,
        kind: metrics.motion ? "MOTION_DETECTED" : "MOTION_CLEARED",
        occurredAt: input.recordedAt,
      },
    });
  }

  if (typeof metrics.on === "boolean") {
    await prisma.device.update({
      where: { id: input.deviceId },
      data: { isOn: metrics.on },
    });
    await prisma.lightingState.upsert({
      where: { deviceId: input.deviceId },
      update: {
        isOn: metrics.on,
        brightness:
          typeof metrics.brightness === "number" ? metrics.brightness : undefined,
      },
      create: {
        deviceId: input.deviceId,
        isOn: metrics.on,
        brightness: typeof metrics.brightness === "number" ? metrics.brightness : 80,
      },
    });
  }

  await prisma.device.update({
    where: { id: input.deviceId },
    data: {
      lastSeen: input.recordedAt,
      lastHeartbeat: input.recordedAt,
      status: "online",
    },
  });

  await upsertHourlyAggregates({ ...input, metrics });

  hub.publish({
    event: input.source === "state" ? "DEVICE_STATE_UPDATED" : "DEVICE_TELEMETRY_UPDATED",
    homeId: input.homeId,
    deviceId: input.deviceId,
    data: metrics,
    ts: input.recordedAt.toISOString(),
  });

  if (metrics.motion === true) {
    await evaluateAutomations({
      homeId: input.homeId,
      type: "MOTION_DETECTED",
      deviceId: input.deviceId,
      metrics,
    });
  } else {
    await evaluateAutomations({
      homeId: input.homeId,
      type: "TELEMETRY",
      deviceId: input.deviceId,
      metrics,
    });
  }

  return { ok: true as const, id: reading.id };
}

async function upsertHourlyAggregates(input: {
  homeId: string;
  deviceId: string;
  recordedAt: Date;
  metrics: Record<string, unknown>;
}) {
  const start = hourStart(input.recordedAt);

  const upsert = async (
    metric: string,
    kind: "counter" | "delta" | "instant",
    value: number
  ) => {
    const existing = await prisma.telemetryAggregate.findUnique({
      where: {
        deviceId_period_periodStart_metric: {
          deviceId: input.deviceId,
          period: "hour",
          periodStart: start,
          metric,
        },
      },
    });
    if (!existing) {
      await prisma.telemetryAggregate.create({
        data: {
          homeId: input.homeId,
          deviceId: input.deviceId,
          period: "hour",
          periodStart: start,
          metric,
          avg: kind === "instant" ? value : 0,
          min: kind === "instant" ? value : 0,
          max: kind === "instant" ? value : 0,
          sum: kind === "delta" ? value : 0,
          last: kind === "delta" ? 0 : value,
          first: kind === "delta" ? null : value,
          sampleCount: 1,
        },
      });
      return;
    }
    if (kind === "counter") {
      await prisma.telemetryAggregate.update({
        where: { id: existing.id },
        data: { last: value, sampleCount: existing.sampleCount + 1 },
      });
      return;
    }
    if (kind === "delta") {
      await prisma.telemetryAggregate.update({
        where: { id: existing.id },
        data: {
          sum: existing.sum + value,
          sampleCount: existing.sampleCount + 1,
        },
      });
      return;
    }
    const n = existing.sampleCount + 1;
    await prisma.telemetryAggregate.update({
      where: { id: existing.id },
      data: {
        avg: (existing.avg * existing.sampleCount + value) / n,
        min: Math.min(existing.min, value),
        max: Math.max(existing.max, value),
        last: value,
        sampleCount: n,
      },
    });
  };

  for (const metric of COUNTER_METRICS) {
    const value = input.metrics[metric];
    if (typeof value === "number") await upsert(metric, "counter", value);
    const delta = input.metrics[`${metric}_delta`];
    if (typeof delta === "number") await upsert(`${metric}_delta`, "delta", delta);
  }

  for (const metric of INSTANT_METRICS) {
    const value = input.metrics[metric];
    if (typeof value === "number") await upsert(metric, "instant", value);
  }
}

export async function applyDeviceStatus(input: {
  homeId: string;
  deviceId: string;
  status: "online" | "offline" | "unknown";
  ip?: string;
  firmware?: string;
  rssi?: number;
  raiseAlert?: boolean;
}) {
  const device = await prisma.device.findFirst({
    where: { id: input.deviceId, homeId: input.homeId },
  });
  if (!device) return { ok: false as const };

  await prisma.device.update({
    where: { id: input.deviceId },
    data: {
      status: input.status,
      ipAddress: input.ip,
      firmwareVersion: input.firmware ?? device.firmwareVersion,
      lastHeartbeat: new Date(),
      lastSeen: input.status === "offline" ? device.lastSeen : new Date(),
    },
  });

  if (typeof input.rssi === "number") {
    await prisma.deviceHeartbeat.create({
      data: { deviceId: input.deviceId, rssi: Math.round(input.rssi) },
    });
  }

  if (input.status === "offline" && input.raiseAlert !== false) {
    await prisma.alert.create({
      data: {
        homeId: input.homeId,
        deviceId: input.deviceId,
        roomId: device.roomId,
        severity: "warning",
        type: "DEVICE_OFFLINE",
        title: "Perangkat offline",
        message: `${device.name} tidak merespons.`,
      },
    });
  }

  hub.publish({
    event: "DEVICE_STATUS_UPDATED",
    homeId: input.homeId,
    deviceId: input.deviceId,
    data: { status: input.status },
    ts: new Date().toISOString(),
  });

  console.log(
    JSON.stringify({
      msg: input.status === "online" ? "Device online" : "Device offline",
      deviceId: input.deviceId,
    })
  );

  return { ok: true as const };
}

export async function ingestDeviceEvent(input: {
  homeId: string;
  deviceId: string;
  ts: Date;
  event: "MOTION_DETECTED" | "MOTION_CLEARED" | "BUTTON_PRESSED" | "SENSOR_ERROR";
  data?: Record<string, unknown>;
}) {
  const device = await prisma.device.findFirst({
    where: { id: input.deviceId, homeId: input.homeId },
  });
  if (!device) return { ok: false as const, error: "unknown_device" };

  if (input.event === "MOTION_DETECTED" || input.event === "MOTION_CLEARED") {
    await prisma.motionEvent.create({
      data: {
        homeId: input.homeId,
        deviceId: input.deviceId,
        kind: input.event,
        occurredAt: input.ts,
      },
    });
  }

  await prisma.device.update({
    where: { id: input.deviceId },
    data: { lastSeen: input.ts, lastHeartbeat: input.ts, status: "online" },
  });

  hub.publish({
    event: "DEVICE_EVENT",
    homeId: input.homeId,
    deviceId: input.deviceId,
    data: { event: input.event, ...(input.data ?? {}) },
    ts: input.ts.toISOString(),
  });

  if (input.event === "MOTION_DETECTED") {
    await evaluateAutomations({
      homeId: input.homeId,
      type: "MOTION_DETECTED",
      deviceId: input.deviceId,
      metrics: input.data,
    });
  }

  return { ok: true as const };
}

export async function applyNodeAvailability(input: {
  homeId: string;
  nodeId: string;
  status: "online" | "offline" | "unknown";
  ip?: string;
  firmware?: string;
  rssi?: number;
}) {
  const devices = await prisma.device.findMany({
    where: { homeId: input.homeId, nodeId: input.nodeId },
  });
  if (devices.length === 0) return { ok: false as const, error: "unknown_node" };

  const transitioningOffline =
    input.status === "offline" && devices.some((d) => d.status !== "offline");

  for (const device of devices) {
    await applyDeviceStatus({
      homeId: input.homeId,
      deviceId: device.id,
      status: input.status,
      ip: input.ip,
      firmware: input.firmware,
      rssi: input.rssi,
      raiseAlert: false,
    });
  }

  if (transitioningOffline) {
    const representative = devices[0];
    await prisma.alert.create({
      data: {
        homeId: input.homeId,
        deviceId: representative.id,
        roomId: representative.roomId,
        severity: "warning",
        type: "DEVICE_OFFLINE",
        title: "Node offline",
        message: `Node ${input.nodeId} tidak merespons (${devices.length} perangkat).`,
      },
    });
  }

  hub.publish({
    event: "NODE_AVAILABILITY_UPDATED",
    homeId: input.homeId,
    data: { nodeId: input.nodeId, status: input.status, deviceCount: devices.length },
    ts: new Date().toISOString(),
  });

  return { ok: true as const, deviceCount: devices.length };
}

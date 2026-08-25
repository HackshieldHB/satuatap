import { prisma, type Prisma } from "@satu-atap/db";
import { evaluateAutomations } from "./automation.js";
import { hub } from "./events.js";

const NUMERIC_METRICS = [
  "voltage",
  "current",
  "power",
  "energy_kwh",
  "frequency",
  "power_factor",
  "flow_lpm",
  "volume_liters",
  "temperature_c",
  "humidity_pct",
  "rssi",
  "brightness",
] as const;

function hourStart(d: Date): Date {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x;
}

export async function ingestTelemetry(input: {
  homeId: string;
  deviceId: string;
  recordedAt: Date;
  metrics: Record<string, unknown>;
}) {
  const device = await prisma.device.findFirst({
    where: { id: input.deviceId, homeId: input.homeId },
  });
  if (!device) return { ok: false as const, error: "unknown_device" };

  const reading = await prisma.telemetryReading.create({
    data: {
      homeId: input.homeId,
      deviceId: input.deviceId,
      recordedAt: input.recordedAt,
      metrics: input.metrics as Prisma.InputJsonValue,
    },
  });

  if (typeof input.metrics.motion === "boolean") {
    await prisma.motionEvent.create({
      data: {
        homeId: input.homeId,
        deviceId: input.deviceId,
        kind: input.metrics.motion ? "MOTION_DETECTED" : "MOTION_CLEARED",
        occurredAt: input.recordedAt,
      },
    });
  }

  if (typeof input.metrics.on === "boolean") {
    await prisma.device.update({
      where: { id: input.deviceId },
      data: { isOn: input.metrics.on },
    });
    await prisma.lightingState.upsert({
      where: { deviceId: input.deviceId },
      update: {
        isOn: input.metrics.on,
        brightness:
          typeof input.metrics.brightness === "number"
            ? input.metrics.brightness
            : undefined,
      },
      create: {
        deviceId: input.deviceId,
        isOn: input.metrics.on,
        brightness:
          typeof input.metrics.brightness === "number"
            ? input.metrics.brightness
            : 80,
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

  await upsertHourlyAggregates(input);

  hub.publish({
    event: "DEVICE_TELEMETRY_UPDATED",
    homeId: input.homeId,
    deviceId: input.deviceId,
    data: input.metrics,
    ts: input.recordedAt.toISOString(),
  });

  if (input.metrics.motion === true) {
    await evaluateAutomations({
      homeId: input.homeId,
      type: "MOTION_DETECTED",
      deviceId: input.deviceId,
      metrics: input.metrics,
    });
  } else {
    await evaluateAutomations({
      homeId: input.homeId,
      type: "TELEMETRY",
      deviceId: input.deviceId,
      metrics: input.metrics,
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
  for (const metric of NUMERIC_METRICS) {
    const value = input.metrics[metric];
    if (typeof value !== "number") continue;
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
          avg: value,
          min: value,
          max: value,
          sum: value,
          last: value,
          sampleCount: 1,
        },
      });
    } else {
      const n = existing.sampleCount + 1;
      await prisma.telemetryAggregate.update({
        where: { id: existing.id },
        data: {
          avg: (existing.avg * existing.sampleCount + value) / n,
          min: Math.min(existing.min, value),
          max: Math.max(existing.max, value),
          sum: existing.sum + value,
          last: value,
          sampleCount: n,
        },
      });
    }
  }
}

export async function applyDeviceStatus(input: {
  homeId: string;
  deviceId: string;
  status: "online" | "offline" | "unknown";
  ip?: string;
  firmware?: string;
  rssi?: number;
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

  if (input.status === "offline") {
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

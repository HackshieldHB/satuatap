import { z } from "zod";
import { CAPABILITIES, DEVICE_TYPES } from "./capabilities.js";

export const capabilitySchema = z.enum(CAPABILITIES);
export const deviceTypeSchema = z.enum(DEVICE_TYPES);

export const telemetryMetricsSchema = z
  .object({
    voltage: z.number().optional(),
    current: z.number().optional(),
    power: z.number().optional(),
    energy_kwh: z.number().optional(),
    frequency: z.number().optional(),
    power_factor: z.number().min(0).max(1).optional(),
    flow_lpm: z.number().optional(),
    volume_liters: z.number().optional(),
    temperature_c: z.number().optional(),
    humidity_pct: z.number().min(0).max(100).optional(),
    motion: z.boolean().optional(),
    rssi: z.number().optional(),
    on: z.boolean().optional(),
    brightness: z.number().min(0).max(100).optional(),
  })
  .strict();

export const telemetryPayloadSchema = z.object({
  ts: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid timestamp"),
  metrics: telemetryMetricsSchema,
});

export const deviceStatusPayloadSchema = z.object({
  status: z.enum(["online", "offline", "unknown"]),
  ip: z.string().optional(),
  firmware: z.string().optional(),
  rssi: z.number().optional(),
});

export const commandTypeSchema = z.enum([
  "TURN_ON",
  "TURN_OFF",
  "SET_VALUE",
  "SET_BRIGHTNESS",
]);

export const commandPayloadSchema = z.object({
  commandId: z.string().min(1),
  type: commandTypeSchema,
  params: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().min(1),
});

export const ackPayloadSchema = z.object({
  commandId: z.string().min(1),
  status: z.enum(["SUCCEEDED", "FAILED"]),
  error: z.string().nullable().optional(),
});

export const createDeviceBodySchema = z.object({
  name: z.string().min(1).max(120),
  type: deviceTypeSchema,
  roomId: z.string().min(1),
  protocol: z.enum(["wifi", "bluetooth", "zigbee", "matter", "mqtt", "other"]),
  capabilities: z.array(capabilitySchema).optional(),
});

export const createCommandBodySchema = z.object({
  type: commandTypeSchema,
  params: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().min(8).max(128),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const automationTriggerSchema = z.object({
  type: z.enum(["MOTION_DETECTED", "TIME", "DEVICE_ON", "TELEMETRY_THRESHOLD"]),
  deviceId: z.string().optional(),
  metric: z.string().optional(),
  op: z.enum(["gt", "lt", "eq"]).optional(),
  value: z.number().optional(),
});

export const automationConditionSchema = z.object({
  type: z.enum(["TIME_RANGE"]),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
});

export const automationActionSchema = z.object({
  type: commandTypeSchema,
  deviceId: z.string().min(1),
  params: z.record(z.unknown()).optional(),
});

export const createAutomationBodySchema = z.object({
  name: z.string().min(1).max(120),
  enabled: z.boolean().default(true),
  trigger: automationTriggerSchema,
  conditions: z.array(automationConditionSchema).default([]),
  actions: z.array(automationActionSchema).min(1),
  icon: z.string().optional(),
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;
export type TelemetryMetrics = z.infer<typeof telemetryMetricsSchema>;
export type CommandType = z.infer<typeof commandTypeSchema>;

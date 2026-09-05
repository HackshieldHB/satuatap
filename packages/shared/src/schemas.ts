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
    energy_kwh_delta: z.number().optional(),
    frequency: z.number().optional(),
    power_factor: z.number().min(0).max(1).optional(),
    flow_lpm: z.number().optional(),
    volume_liters: z.number().optional(),
    volume_liters_delta: z.number().optional(),
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

export const statePayloadSchema = telemetryPayloadSchema;

export const eventPayloadSchema = z.object({
  ts: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid timestamp"),
  event: z.enum([
    "MOTION_DETECTED",
    "MOTION_CLEARED",
    "BUTTON_PRESSED",
    "SENSOR_ERROR",
  ]),
  data: z.record(z.unknown()).optional(),
});

export const availabilityPayloadSchema = z.object({
  status: z.enum(["online", "offline", "unknown"]),
  firmware: z.string().optional(),
  build: z.number().optional(),
  ip: z.string().optional(),
  mac: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/)
    .optional(),
  rssi: z.number().optional(),
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

export const waterMeterConfigSchema = z.object({
  pulsesPerLiter: z.number().positive(),
  offsetLiters: z.number(),
});

export const energyMeterConfigSchema = z.object({
  ctRatio: z.number().positive(),
  offsetKwh: z.number(),
});

export const deviceConfigSchema = z.union([waterMeterConfigSchema, energyMeterConfigSchema]);

export const patchDeviceConfigBodySchema = z.object({
  config: z.record(z.unknown()),
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

export const paymentChannelSchema = z.enum([
  "qris",
  "cash",
  "virtual_account",
  "bank_transfer",
  "credit_card",
]);

export const orderStatusSchema = z.enum([
  "confirmed",
  "preparing",
  "delivering",
  "completed",
  "cancelled",
]);

export const createOrderBodySchema = z.object({
  vendorId: z.string().min(1),
  items: z
    .array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(99) }))
    .min(1),
  paymentChannel: paymentChannelSchema,
  note: z.string().max(300).optional(),
});

export const updateOrderStatusBodySchema = z.object({ status: orderStatusSchema });

// ─── Billing (postpaid invoices) ─────────────────────────────────────────────

export const payInvoiceBodySchema = z.object({
  paymentChannel: paymentChannelSchema.default("qris"),
});

export const generateInvoiceBodySchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

// ─── Access control ──────────────────────────────────────────────────────────

export const createPassBodySchema = z.object({
  label: z.string().min(1).max(80),
  kind: z.enum(["guest", "courier", "resident"]).default("guest"),
  validMinutes: z.number().int().min(5).max(43200).default(120), // ≤ 30 days
  maxUses: z.number().int().min(0).max(100).default(0),
});

export const verifyAccessBodySchema = z.object({
  code: z.string().min(4).max(64),
});

// ─── Prepaid utility wallet ──────────────────────────────────────────────────

export const prepaidTopupBodySchema = z.object({
  amountIdr: z.number().int().min(1000).max(5_000_000),
  paymentChannel: paymentChannelSchema.default("qris"),
});

export const prepaidConfigBodySchema = z.object({
  enabled: z.boolean().optional(),
  lowBalanceThresholdIdr: z.number().int().min(0).max(1_000_000).optional(),
  electricityRelayDeviceId: z.string().nullable().optional(),
  waterValveDeviceId: z.string().nullable().optional(),
});

/**
 * Price a telemetry window's metered usage in IDR from tariffs. Water tariff is
 * per m³ but the meter reports litres, so litres are converted (÷1000). Shared
 * so the API deduction path and any UI estimate agree on the exact arithmetic.
 */
export function priceUsageIdr(input: {
  energyKwh: number;
  waterLiters: number;
  electricityTariffPerKwh: number;
  waterTariffPerM3: number;
}): number {
  const energyCost = Math.max(0, input.energyKwh) * input.electricityTariffPerKwh;
  const waterCost = (Math.max(0, input.waterLiters) / 1000) * input.waterTariffPerM3;
  return energyCost + waterCost;
}

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;
export type TelemetryMetrics = z.infer<typeof telemetryMetricsSchema>;
export type CommandType = z.infer<typeof commandTypeSchema>;
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type OrderStatusValue = z.infer<typeof orderStatusSchema>;

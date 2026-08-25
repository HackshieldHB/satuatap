/** Capability keys — business logic depends on these, not hardware SKUs. */
export const CAPABILITIES = [
  "voltage",
  "current",
  "power",
  "energy",
  "frequency",
  "power_factor",
  "flow",
  "volume",
  "temperature",
  "humidity",
  "motion",
  "on_off",
  "brightness",
  "rssi",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const DEVICE_TYPES = [
  "energy_meter",
  "water_meter",
  "temperature_sensor",
  "humidity_sensor",
  "environment_sensor",
  "motion_sensor",
  "light",
  "switch",
  "smart_plug",
  "camera",
  "other",
] as const;

export type DeviceTypeId = (typeof DEVICE_TYPES)[number];

export const DEFAULT_CAPABILITIES: Record<DeviceTypeId, Capability[]> = {
  energy_meter: ["voltage", "current", "power", "energy", "frequency", "power_factor"],
  water_meter: ["flow", "volume"],
  temperature_sensor: ["temperature"],
  humidity_sensor: ["humidity"],
  environment_sensor: ["temperature", "humidity"],
  motion_sensor: ["motion"],
  light: ["on_off", "brightness"],
  switch: ["on_off"],
  smart_plug: ["on_off", "power"],
  camera: [],
  other: [],
};

export function hasCapability(
  capabilities: readonly string[],
  cap: Capability
): boolean {
  return capabilities.includes(cap);
}

export const COUNTER_METRICS = ["energy_kwh", "volume_liters"] as const;
export type CounterMetric = (typeof COUNTER_METRICS)[number];

export const INSTANT_METRICS = [
  "voltage",
  "current",
  "power",
  "frequency",
  "power_factor",
  "flow_lpm",
  "temperature_c",
  "humidity_pct",
  "rssi",
  "brightness",
] as const;
export type InstantMetric = (typeof INSTANT_METRICS)[number];

export const COUNTER_DELTA_CEILINGS: Record<CounterMetric, number> = {
  energy_kwh: 5,
  volume_liters: 500,
};

export function isCounterMetric(key: string): key is CounterMetric {
  return (COUNTER_METRICS as readonly string[]).includes(key);
}

/** Maps future hardware SKUs to logical device types. Not used at runtime for branching. */
export const HARDWARE_SKU_MAP = {
  "pzem-004t": "energy_meter",
  "yf-s201": "water_meter",
  dht22: "environment_sensor",
  "hc-sr501": "motion_sensor",
  "relay-4ch": "switch",
} as const;

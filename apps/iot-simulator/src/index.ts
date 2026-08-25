/**
 * MQTT device simulator — behaves like future ESP32 firmware.
 * Does NOT write to the database. Publishes only over MQTT.
 */
import mqtt, { type MqttClient } from "mqtt";
import {
  mqttTopic,
  nodeAvailabilityTopic,
  commandPayloadSchema,
  type MqttChannel,
} from "@satu-atap/shared";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883";
const HOME_ID = process.env.HOME_ID ?? "home-1";
const ENERGY_MS = Number(process.env.ENERGY_INTERVAL_MS ?? 5000);
const WATER_MS = Number(process.env.WATER_INTERVAL_MS ?? 5000);
const ENV_MS = Number(process.env.ENVIRONMENT_INTERVAL_MS ?? 10000);
const MOTION_MS = Number(process.env.MOTION_INTERVAL_MS ?? 20000);
const LIGHT_MS = Number(process.env.LIGHTING_INTERVAL_MS ?? 15000);

const devices = {
  energyMain: "energy-main",
  energyAc: "energy-ac",
  waterMain: "water-main",
  waterKitchen: "water-kitchen",
  envLiving: "env-living-room",
  envBed: "env-bedroom",
  pirLiving: "pir-living-room",
  pirBed: "pir-bedroom",
  lightLiving: "light-living-room",
  lightBed: "light-bedroom",
  lightKitchen: "light-kitchen",
  lightSpare: "light-spare",
};

const nodes = [
  { id: "esp32-energy-001", deviceIds: [devices.energyMain, devices.energyAc] },
  {
    id: "esp32-water-env-001",
    deviceIds: [
      devices.waterMain,
      devices.waterKitchen,
      devices.envLiving,
      devices.envBed,
      devices.pirLiving,
      devices.pirBed,
    ],
  },
  {
    id: "esp32-lighting-001",
    deviceIds: [devices.lightLiving, devices.lightBed, devices.lightKitchen, devices.lightSpare],
  },
] as const;

const lights: Record<string, { on: boolean }> = {
  [devices.lightLiving]: { on: false },
  [devices.lightBed]: { on: false },
  [devices.lightKitchen]: { on: false },
  [devices.lightSpare]: { on: false },
};

let energyMainKwh = 4.5;
let energyAcKwh = 1.2;
let volumeMain = 120;
let volumeKitchen = 40;

const deviceClient = new Map<string, MqttClient>();

function nowTs() {
  return new Date().toISOString();
}

function jitter(base: number, amt: number) {
  return base + (Math.random() * 2 - 1) * amt;
}

function pub(deviceId: string, channel: MqttChannel, payload: unknown, retain = false) {
  const client = deviceClient.get(deviceId);
  if (!client) return;
  client.publish(mqttTopic(HOME_ID, deviceId, channel), JSON.stringify(payload), {
    qos: 1,
    retain,
  });
}

function energyMetrics(kwh: number) {
  return {
    voltage: Number(jitter(220, 4).toFixed(2)),
    current: Number(jitter(2.1, 0.6).toFixed(3)),
    power: Number(jitter(460, 120).toFixed(1)),
    energy_kwh: Number(kwh.toFixed(4)),
    frequency: Number(jitter(50, 0.2).toFixed(2)),
    power_factor: Number(jitter(0.92, 0.04).toFixed(3)),
  };
}

function connectNode(nodeId: string, deviceIds: readonly string[]) {
  const client = mqtt.connect(MQTT_URL, {
    clientId: `satuatap-sim-${nodeId}-${process.pid}`,
    will: {
      topic: nodeAvailabilityTopic(HOME_ID, nodeId),
      payload: JSON.stringify({ status: "offline" }),
      qos: 1,
      retain: true,
    },
  });
  for (const id of deviceIds) deviceClient.set(id, client);

  client.on("connect", () => {
    console.log(JSON.stringify({ msg: "Simulator MQTT connected", nodeId }));
    client.publish(
      nodeAvailabilityTopic(HOME_ID, nodeId),
      JSON.stringify({ status: "online", firmware: "sim-1.0.0", rssi: -55 }),
      { qos: 1, retain: true }
    );
    for (const id of deviceIds) {
      client.subscribe(mqttTopic(HOME_ID, id, "command"), { qos: 1 });
    }
  });

  client.on("message", (topic, buf) => {
    const parts = topic.split("/");
    const deviceId = parts[3];
    const parsed = commandPayloadSchema.safeParse(JSON.parse(buf.toString()));
    if (!parsed.success) return;
    const cmd = parsed.data;
    const light = lights[deviceId];
    if (light) {
      if (cmd.type === "TURN_ON") light.on = true;
      if (cmd.type === "TURN_OFF") light.on = false;
    }
    pub(deviceId, "ack", { commandId: cmd.commandId, status: "SUCCEEDED", error: null });
    if (light) {
      pub(deviceId, "state", { ts: nowTs(), metrics: { on: light.on } }, true);
    }
  });

  client.on("error", (err) => {
    console.error(JSON.stringify({ msg: "Simulator MQTT error", nodeId, error: err.message }));
  });
}

for (const node of nodes) {
  connectNode(node.id, node.deviceIds);
}

setInterval(() => {
  energyMainKwh += 0.002 + Math.random() * 0.004;
  energyAcKwh += 0.001 + Math.random() * 0.002;
  pub(devices.energyMain, "telemetry", { ts: nowTs(), metrics: energyMetrics(energyMainKwh) });
  pub(devices.energyAc, "telemetry", { ts: nowTs(), metrics: energyMetrics(energyAcKwh) });
}, ENERGY_MS);

setInterval(() => {
  const flowMain = Math.max(0, jitter(8, 6));
  const flowKitchen = Math.max(0, jitter(3, 2));
  volumeMain += flowMain * (WATER_MS / 60000);
  volumeKitchen += flowKitchen * (WATER_MS / 60000);
  pub(devices.waterMain, "telemetry", {
    ts: nowTs(),
    metrics: { flow_lpm: Number(flowMain.toFixed(2)), volume_liters: Number(volumeMain.toFixed(2)) },
  });
  pub(devices.waterKitchen, "telemetry", {
    ts: nowTs(),
    metrics: {
      flow_lpm: Number(flowKitchen.toFixed(2)),
      volume_liters: Number(volumeKitchen.toFixed(2)),
    },
  });
}, WATER_MS);

setInterval(() => {
  pub(devices.envLiving, "telemetry", {
    ts: nowTs(),
    metrics: {
      temperature_c: Number(jitter(24.8, 0.8).toFixed(1)),
      humidity_pct: Number(jitter(66, 6).toFixed(1)),
    },
  });
  pub(devices.envBed, "telemetry", {
    ts: nowTs(),
    metrics: {
      temperature_c: Number(jitter(23.4, 0.6).toFixed(1)),
      humidity_pct: Number(jitter(62, 5).toFixed(1)),
    },
  });
}, ENV_MS);

setInterval(() => {
  pub(devices.pirLiving, "event", {
    ts: nowTs(),
    event: Math.random() < 0.35 ? "MOTION_DETECTED" : "MOTION_CLEARED",
  });
  pub(devices.pirBed, "event", {
    ts: nowTs(),
    event: Math.random() < 0.2 ? "MOTION_DETECTED" : "MOTION_CLEARED",
  });
}, MOTION_MS);

setInterval(() => {
  for (const [id, st] of Object.entries(lights)) {
    pub(id, "state", { ts: nowTs(), metrics: { on: st.on } }, true);
  }
}, LIGHT_MS);

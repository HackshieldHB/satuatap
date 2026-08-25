import { randomUUID } from "node:crypto";
import { prisma, CommandStatus, type Prisma } from "@satu-atap/db";
import { hasCapability } from "@satu-atap/shared";
import { hub } from "./events.js";
import { config } from "./config.js";
import { audit } from "./auth.js";

type Trigger = {
  type: string;
  deviceId?: string;
  metric?: string;
  op?: "gt" | "lt" | "eq";
  value?: number;
};

type Condition = { type: string; from?: string; to?: string };
type Action = { type: string; deviceId: string; params?: Record<string, unknown> };

function minutesNowJakarta(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function inTimeRange(from: string, to: string, nowMin = minutesNowJakarta()): boolean {
  const a = parseHm(from);
  const b = parseHm(to);
  if (a <= b) return nowMin >= a && nowMin <= b;
  return nowMin >= a || nowMin <= b;
}

export function conditionsPass(conditions: Condition[], nowMin?: number): boolean {
  for (const c of conditions) {
    if (c.type === "TIME_RANGE" && c.from && c.to) {
      if (!inTimeRange(c.from, c.to, nowMin)) return false;
    }
  }
  return true;
}

export function triggerMatches(
  trigger: Trigger,
  event: { type: string; deviceId?: string; metrics?: Record<string, unknown> }
): boolean {
  if (trigger.type === "MOTION_DETECTED") {
    return (
      event.type === "MOTION_DETECTED" &&
      (!trigger.deviceId || trigger.deviceId === event.deviceId)
    );
  }
  if (trigger.type === "TELEMETRY_THRESHOLD" && trigger.metric && trigger.op != null) {
    if (event.deviceId !== trigger.deviceId) return false;
    const raw = event.metrics?.[trigger.metric];
    if (typeof raw !== "number" || trigger.value == null) return false;
    if (trigger.op === "gt") return raw > trigger.value;
    if (trigger.op === "lt") return raw < trigger.value;
    return raw === trigger.value;
  }
  if (trigger.type === "DEVICE_ON") {
    return event.type === "DEVICE_ON" && trigger.deviceId === event.deviceId;
  }
  return false;
}

async function notifyGateway(commandId: string) {
  try {
    await fetch(`${config.gatewayUrl}/internal/publish-command`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-key": config.internalApiKey,
      },
      body: JSON.stringify({ commandId }),
    });
  } catch {
    // Gateway may be down; command stays PENDING for poller.
  }
}

export async function createCommand(opts: {
  homeId: string;
  deviceId: string;
  type: string;
  params: Record<string, unknown>;
  idempotencyKey: string;
  createdById?: string | null;
}) {
  const existing = await prisma.command.findUnique({
    where: { homeId_idempotencyKey: { homeId: opts.homeId, idempotencyKey: opts.idempotencyKey } },
  });
  if (existing) return existing;

  const device = await prisma.device.findFirst({
    where: { id: opts.deviceId, homeId: opts.homeId },
    include: { capabilities: true },
  });
  if (!device) throw Object.assign(new Error("Device not found"), { statusCode: 404 });

  const caps = device.capabilities.map((c) => c.capability);
  if (
    (opts.type === "TURN_ON" || opts.type === "TURN_OFF" || opts.type === "SET_BRIGHTNESS") &&
    !hasCapability(caps, "on_off") &&
    !hasCapability(caps, "brightness")
  ) {
    throw Object.assign(new Error("Device does not support this command"), { statusCode: 400 });
  }

  const cmd = await prisma.command.create({
    data: {
      homeId: opts.homeId,
      deviceId: opts.deviceId,
      type: opts.type,
      params: opts.params as Prisma.InputJsonValue,
      idempotencyKey: opts.idempotencyKey,
      createdById: opts.createdById ?? null,
      status: CommandStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  await audit(opts.createdById ?? null, "command.created", "Command", cmd.id, {
    homeId: opts.homeId,
    deviceId: opts.deviceId,
    type: opts.type,
  });

  hub.publish({
    event: "COMMAND_CREATED",
    homeId: opts.homeId,
    deviceId: opts.deviceId,
    data: { commandId: cmd.id, type: opts.type, status: cmd.status },
    ts: new Date().toISOString(),
  });

  await notifyGateway(cmd.id);
  return cmd;
}

export async function evaluateAutomations(event: {
  homeId: string;
  type: string;
  deviceId?: string;
  metrics?: Record<string, unknown>;
}) {
  const rules = await prisma.automationRule.findMany({
    where: { homeId: event.homeId, enabled: true },
  });

  for (const rule of rules) {
    const trigger = rule.trigger as Trigger;
    const conditions = (rule.conditions as Condition[]) ?? [];
    const actions = (rule.actions as Action[]) ?? [];

    if (!triggerMatches(trigger, event)) continue;
    if (!conditionsPass(conditions)) {
      await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          status: "skipped",
          result: { reason: "conditions_failed" },
        },
      });
      continue;
    }

    const commandIds: string[] = [];
    try {
      for (const action of actions) {
        const cmd = await createCommand({
          homeId: event.homeId,
          deviceId: action.deviceId,
          type: action.type,
          params: action.params ?? {},
          idempotencyKey: `auto:${rule.id}:${event.type}:${Date.now()}:${randomUUID()}`,
        });
        commandIds.push(cmd.id);
      }
      await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          status: "executed",
          result: { commandIds },
        },
      });
      hub.publish({
        event: "AUTOMATION_EXECUTED",
        homeId: event.homeId,
        data: { ruleId: rule.id, commandIds },
        ts: new Date().toISOString(),
      });
      console.log(
        JSON.stringify({ msg: "Automation executed", ruleId: rule.id, homeId: event.homeId })
      );
    } catch (err) {
      await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          status: "failed",
          result: { error: err instanceof Error ? err.message : "unknown" },
        },
      });
    }
  }
}

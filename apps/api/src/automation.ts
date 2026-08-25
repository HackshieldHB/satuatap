import { randomUUID } from "node:crypto";
import { prisma, CommandStatus, type Prisma } from "@satu-atap/db";
import {
  clockInTimeZone,
  conditionsPass,
  evaluateRules,
  hasCapability,
  triggerMatches,
  type Action,
  type AutomationEvent,
  type AutomationRule,
  type Condition,
  type EvaluationContext,
  type Trigger,
} from "@satu-atap/shared";
import { hub } from "./events.js";
import { config } from "./config.js";
import { audit } from "./auth.js";

function buildContext(lastMotionAt: Record<string, number>, at = new Date()): EvaluationContext {
  const clock = clockInTimeZone(at, "Asia/Jakarta");
  return {
    nowMinutes: clock.nowMinutes,
    timezone: "Asia/Jakarta",
    lastMotionAt,
    nowMs: at.getTime(),
    weekday: clock.weekday,
  };
}

async function loadLastMotionAt(homeId: string): Promise<Record<string, number>> {
  const rows = await prisma.motionEvent.findMany({
    where: { homeId },
    orderBy: { occurredAt: "desc" },
    select: { deviceId: true, occurredAt: true },
  });
  const map: Record<string, number> = {};
  for (const row of rows) {
    if (map[row.deviceId] == null) map[row.deviceId] = row.occurredAt.getTime();
  }
  return map;
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
  const rows = await prisma.automationRule.findMany({
    where: { homeId: event.homeId, enabled: true },
  });
  const lastMotionAt = await loadLastMotionAt(event.homeId);
  const ctx = buildContext(lastMotionAt);
  const autoEvent: AutomationEvent = {
    type: event.type,
    deviceId: event.deviceId,
    metrics: event.metrics,
  };
  const rules: AutomationRule[] = rows.map((rule) => ({
    id: rule.id,
    enabled: rule.enabled,
    trigger: rule.trigger as Trigger,
    conditions: (rule.conditions as Condition[]) ?? [],
    actions: (rule.actions as Action[]) ?? [],
  }));

  for (const rule of rules) {
    if (!triggerMatches(rule.trigger, autoEvent, ctx)) continue;
    if (!conditionsPass(rule.conditions, ctx)) {
      await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          status: "skipped",
          result: { reason: "conditions_failed" },
        },
      });
    }
  }

  const plan = evaluateRules(rules, autoEvent, ctx);
  for (const item of plan) {
    const commandIds: string[] = [];
    try {
      for (const action of item.actions) {
        const cmd = await createCommand({
          homeId: event.homeId,
          deviceId: action.deviceId,
          type: action.type,
          params: action.params ?? {},
          idempotencyKey: `auto:${item.dedupeKey}:${randomUUID()}`,
        });
        commandIds.push(cmd.id);
      }
      await prisma.automationExecution.create({
        data: {
          ruleId: item.ruleId,
          status: "executed",
          result: { commandIds, dedupeKey: item.dedupeKey },
        },
      });
      hub.publish({
        event: "AUTOMATION_EXECUTED",
        homeId: event.homeId,
        data: { ruleId: item.ruleId, commandIds },
        ts: new Date().toISOString(),
      });
      console.log(
        JSON.stringify({ msg: "Automation executed", ruleId: item.ruleId, homeId: event.homeId })
      );
    } catch (err) {
      await prisma.automationExecution.create({
        data: {
          ruleId: item.ruleId,
          status: "failed",
          result: { error: err instanceof Error ? err.message : "unknown" },
        },
      });
    }
  }
}

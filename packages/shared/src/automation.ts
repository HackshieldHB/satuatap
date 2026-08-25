export type Trigger = {
  type: string;
  deviceId?: string;
  metric?: string;
  op?: "gt" | "lt" | "eq";
  value?: number;
  at?: string;
  days?: number[];
  minutes?: number;
};

export type Condition = { type: string; from?: string; to?: string };

export type Action = { type: string; deviceId: string; params?: Record<string, unknown> };

export type AutomationRule = {
  id: string;
  enabled?: boolean;
  trigger: Trigger;
  conditions?: Condition[];
  actions: Action[];
};

export type AutomationEvent = {
  type: string;
  deviceId?: string;
  metrics?: Record<string, unknown>;
};

export type EvaluationContext = {
  nowMinutes: number;
  timezone: string;
  lastMotionAt: Record<string, number>;
  nowMs: number;
  weekday?: number;
};

export type RulePlanItem = {
  ruleId: string;
  actions: Action[];
  dedupeKey: string;
};

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function clockInTimeZone(
  at: Date,
  timeZone: string
): { nowMinutes: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(at);
  const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "0";
  const h = hourRaw === "24" ? 0 : Number(hourRaw);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { nowMinutes: h * 60 + m, weekday: weekdays[wd] ?? 0 };
}

export function inTimeRange(from: string, to: string, nowMinutes: number): boolean {
  const a = parseHm(from);
  const b = parseHm(to);
  if (a <= b) return nowMinutes >= a && nowMinutes <= b;
  return nowMinutes >= a || nowMinutes <= b;
}

export function conditionsPass(conditions: Condition[] | undefined, ctx: EvaluationContext): boolean {
  if (!conditions || conditions.length === 0) return true;
  for (const c of conditions) {
    if (c.type === "TIME_RANGE" && c.from && c.to) {
      if (!inTimeRange(c.from, c.to, ctx.nowMinutes)) return false;
    }
  }
  return true;
}

function isSchedulerEvent(event: AutomationEvent): boolean {
  return event.type === "TIME" || event.type === "SCHEDULER_TICK";
}

export function triggerMatches(
  trigger: Trigger,
  event: AutomationEvent,
  ctx: EvaluationContext
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
  if (trigger.type === "TIME") {
    if (!isSchedulerEvent(event) || !trigger.at) return false;
    if (parseHm(trigger.at) !== ctx.nowMinutes) return false;
    if (trigger.days && trigger.days.length > 0) {
      if (ctx.weekday == null || !trigger.days.includes(ctx.weekday)) return false;
    }
    return true;
  }
  if (trigger.type === "NO_MOTION_FOR") {
    if (!isSchedulerEvent(event)) return false;
    if (!trigger.deviceId || trigger.minutes == null) return false;
    const last = ctx.lastMotionAt[trigger.deviceId];
    if (last == null) return false;
    return ctx.nowMs - last >= trigger.minutes * 60_000;
  }
  return false;
}

function dedupeKey(rule: AutomationRule, event: AutomationEvent, ctx: EvaluationContext): string {
  const trigger = rule.trigger;
  if (trigger.type === "NO_MOTION_FOR" && trigger.deviceId) {
    const last = ctx.lastMotionAt[trigger.deviceId] ?? "none";
    return `${rule.id}:NO_MOTION_FOR:${trigger.deviceId}:${last}`;
  }
  if (trigger.type === "TIME") {
    return `${rule.id}:TIME:${trigger.at ?? ""}:${ctx.nowMinutes}:${ctx.weekday ?? ""}`;
  }
  return `${rule.id}:${event.type}:${event.deviceId ?? ""}:${ctx.nowMinutes}`;
}

export function evaluateRules(
  rules: AutomationRule[],
  event: AutomationEvent,
  ctx: EvaluationContext
): RulePlanItem[] {
  const plan: RulePlanItem[] = [];
  for (const rule of rules) {
    if (rule.enabled === false) continue;
    try {
      if (!triggerMatches(rule.trigger, event, ctx)) continue;
      if (!conditionsPass(rule.conditions, ctx)) continue;
      plan.push({
        ruleId: rule.id,
        actions: rule.actions ?? [],
        dedupeKey: dedupeKey(rule, event, ctx),
      });
    } catch {
      continue;
    }
  }
  return plan;
}

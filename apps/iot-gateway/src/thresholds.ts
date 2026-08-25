export type Threshold = {
  id: string;
  homeId: string;
  type: string;
  metric: string;
  op: "gt" | "lt";
  value: number;
  forSeconds: number;
  severity: string;
  enabled: boolean;
};

export type ThresholdState = {
  open: boolean;
  breachedSince: number | null;
  okSince: number | null;
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function metricBreaches(op: "gt" | "lt", value: number, threshold: number): boolean {
  if (op === "gt") return value > threshold;
  return value < threshold;
}

export function evaluateHysteresis(
  threshold: Threshold,
  metricValue: number,
  state: ThresholdState,
  now: number
): { fire: boolean; resolve: boolean; state: ThresholdState } {
  const hold = threshold.forSeconds * 1000;
  const breached = metricBreaches(threshold.op, metricValue, threshold.value);
  let open = state.open;
  let breachedSince = state.breachedSince;
  let okSince = state.okSince;
  let fire = false;
  let resolve = false;

  if (breached) {
    okSince = null;
    if (breachedSince == null) breachedSince = now;
    if (!open && now - breachedSince >= hold) {
      open = true;
      fire = true;
    }
  } else {
    breachedSince = null;
    if (okSince == null) okSince = now;
    if (open && now - okSince >= hold) {
      open = false;
      resolve = true;
      okSince = null;
    }
  }

  return { fire, resolve, state: { open, breachedSince, okSince } };
}

export function abnormalWater(todayLiters: number, trailingDays: number[], multiplier: number): boolean {
  if (trailingDays.length === 0) return false;
  const med = median(trailingDays);
  if (med <= 0) return false;
  return todayLiters > med * multiplier;
}

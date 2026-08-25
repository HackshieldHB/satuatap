import { describe, expect, it } from "vitest";
import { abnormalWater, evaluateHysteresis, median, type Threshold } from "./thresholds.js";

const power: Threshold = {
  id: "t1",
  homeId: "home-1",
  type: "HIGH_ELECTRICITY",
  metric: "power",
  op: "gt",
  value: 3000,
  forSeconds: 0,
  severity: "warning",
  enabled: true,
};

describe("threshold hysteresis", () => {
  it("does not double-fire while an alert is still open", () => {
    const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
    const first = evaluateHysteresis(power, 3500, { open: false, breachedSince: null, okSince: null }, t0);
    expect(first.fire).toBe(true);
    expect(first.state.open).toBe(true);
    const second = evaluateHysteresis(power, 3600, first.state, t0 + 1000);
    expect(second.fire).toBe(false);
    expect(second.state.open).toBe(true);
  });

  it("resolves after the metric stays in bounds for forSeconds", () => {
    const leak: Threshold = { ...power, type: "POSSIBLE_LEAK", metric: "flow_lpm", value: 15, forSeconds: 2 };
    const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
    const opened = evaluateHysteresis(leak, 20, { open: false, breachedSince: t0 - 3000, okSince: null }, t0);
    expect(opened.fire).toBe(true);
    const stillOpen = evaluateHysteresis(leak, 10, opened.state, t0 + 1000);
    expect(stillOpen.resolve).toBe(false);
    const resolved = evaluateHysteresis(leak, 10, stillOpen.state, t0 + 3500);
    expect(resolved.resolve).toBe(true);
    expect(resolved.state.open).toBe(false);
  });
});

describe("abnormal water median", () => {
  it("ignores a single spike day when computing the trailing median", () => {
    const days = [100, 110, 90, 105, 95, 100, 800];
    expect(median(days)).toBe(100);
    expect(abnormalWater(150, days, 2)).toBe(false);
    expect(abnormalWater(250, days, 2)).toBe(true);
  });
});

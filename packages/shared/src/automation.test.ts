import { describe, expect, it } from "vitest";
import {
  clockInTimeZone,
  conditionsPass,
  evaluateRules,
  inTimeRange,
  triggerMatches,
  type AutomationRule,
  type EvaluationContext,
} from "./automation.js";

const baseCtx = (over: Partial<EvaluationContext> = {}): EvaluationContext => ({
  nowMinutes: 12 * 60,
  timezone: "Asia/Jakarta",
  lastMotionAt: {},
  nowMs: Date.UTC(2026, 0, 15, 5, 0, 0),
  weekday: 4,
  ...over,
});

describe("automation engine", () => {
  it("matches motion trigger", () => {
    expect(
      triggerMatches(
        { type: "MOTION_DETECTED", deviceId: "dev-pir-living" },
        { type: "MOTION_DETECTED", deviceId: "dev-pir-living" },
        baseCtx()
      )
    ).toBe(true);
  });

  it("ignores disabled-equivalent failed condition", () => {
    expect(
      conditionsPass([{ type: "TIME_RANGE", from: "23:00", to: "23:01" }], baseCtx({ nowMinutes: 10 }))
    ).toBe(false);
  });

  it("passes wide time range", () => {
    expect(inTimeRange("00:00", "23:59", 12 * 60)).toBe(true);
  });

  it("evaluates telemetry threshold", () => {
    expect(
      triggerMatches(
        {
          type: "TELEMETRY_THRESHOLD",
          deviceId: "energy-main",
          metric: "power",
          op: "gt",
          value: 500,
        },
        { type: "TELEMETRY", deviceId: "energy-main", metrics: { power: 712 } },
        baseCtx()
      )
    ).toBe(true);
  });

  it("uses a fixed UTC+7 offset for Asia/Jakarta with no DST", () => {
    const winter = clockInTimeZone(new Date("2026-01-15T00:00:00.000Z"), "Asia/Jakarta");
    const summer = clockInTimeZone(new Date("2026-07-15T00:00:00.000Z"), "Asia/Jakarta");
    expect(winter.nowMinutes).toBe(7 * 60);
    expect(summer.nowMinutes).toBe(7 * 60);
  });

  it("matches a time range that wraps past midnight", () => {
    expect(inTimeRange("22:00", "06:00", 23 * 60)).toBe(true);
    expect(inTimeRange("22:00", "06:00", 2 * 60)).toBe(true);
    expect(inTimeRange("22:00", "06:00", 12 * 60)).toBe(false);
  });

  it("treats an empty conditions array as passing", () => {
    expect(conditionsPass([], baseCtx())).toBe(true);
    expect(conditionsPass(undefined, baseCtx())).toBe(true);
  });

  it("returns no match for an unknown trigger type rather than throwing", () => {
    expect(() =>
      triggerMatches({ type: "FUTURE_TRIGGER", deviceId: "x" }, { type: "TIME" }, baseCtx())
    ).not.toThrow();
    expect(
      triggerMatches({ type: "FUTURE_TRIGGER", deviceId: "x" }, { type: "TIME" }, baseCtx())
    ).toBe(false);
    expect(
      evaluateRules(
        [
          {
            id: "r-unknown",
            trigger: { type: "FROM_THE_FUTURE" },
            actions: [{ type: "TURN_ON", deviceId: "light-living-room" }],
          },
        ],
        { type: "TIME" },
        baseCtx()
      )
    ).toEqual([]);
  });

  it("does not re-fire NO_MOTION_FOR within the same idle window", () => {
    const last = Date.UTC(2026, 0, 15, 4, 0, 0);
    const rule: AutomationRule = {
      id: "auto-living-no-motion",
      trigger: { type: "NO_MOTION_FOR", deviceId: "pir-living-room", minutes: 10 },
      actions: [{ type: "TURN_OFF", deviceId: "light-living-room" }],
    };
    const ctx = baseCtx({
      lastMotionAt: { "pir-living-room": last },
      nowMs: last + 11 * 60_000,
    });
    const first = evaluateRules([rule], { type: "TIME" }, ctx);
    const second = evaluateRules([rule], { type: "TIME" }, ctx);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0].dedupeKey).toBe(second[0].dedupeKey);

    const afterMotion = evaluateRules([rule], { type: "TIME" }, {
      ...ctx,
      lastMotionAt: { "pir-living-room": last + 20 * 60_000 },
      nowMs: last + 31 * 60_000,
    });
    expect(afterMotion[0].dedupeKey).not.toBe(first[0].dedupeKey);
  });

  it("matches TIME on the exact minute and not the minute before or after", () => {
    const rule: AutomationRule = {
      id: "auto-time",
      trigger: { type: "TIME", at: "18:30" },
      actions: [{ type: "TURN_ON", deviceId: "light-living-room" }],
    };
    const event = { type: "TIME" as const };
    expect(evaluateRules([rule], event, baseCtx({ nowMinutes: 18 * 60 + 30 }))).toHaveLength(1);
    expect(evaluateRules([rule], event, baseCtx({ nowMinutes: 18 * 60 + 29 }))).toHaveLength(0);
    expect(evaluateRules([rule], event, baseCtx({ nowMinutes: 18 * 60 + 31 }))).toHaveLength(0);
  });
});

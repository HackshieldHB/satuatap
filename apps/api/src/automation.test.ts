import { describe, expect, it } from "vitest";
import { conditionsPass, inTimeRange, triggerMatches } from "./automation.js";

describe("automation engine", () => {
  it("matches motion trigger", () => {
    expect(
      triggerMatches(
        { type: "MOTION_DETECTED", deviceId: "dev-pir-living" },
        { type: "MOTION_DETECTED", deviceId: "dev-pir-living" }
      )
    ).toBe(true);
  });

  it("ignores disabled-equivalent failed condition", () => {
    expect(conditionsPass([{ type: "TIME_RANGE", from: "23:00", to: "23:01" }], 10)).toBe(
      false
    );
  });

  it("passes wide time range", () => {
    expect(inTimeRange("00:00", "23:59", 12 * 60)).toBe(true);
  });

  it("evaluates telemetry threshold", () => {
    expect(
      triggerMatches(
        { type: "TELEMETRY_THRESHOLD", deviceId: "energy-main", metric: "power", op: "gt", value: 500 },
        { type: "TELEMETRY", deviceId: "energy-main", metrics: { power: 712 } }
      )
    ).toBe(true);
  });
});

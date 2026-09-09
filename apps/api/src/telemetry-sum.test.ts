import { describe, expect, it } from "vitest";
import { sumDeltaMetric } from "./telemetry-sum.js";

describe("sumDeltaMetric", () => {
  it("rejects unknown metric keys so SQL cannot interpolate arbitrary JSON paths", async () => {
    await expect(
      sumDeltaMetric("home-1", "not_a_metric", new Date(), new Date())
    ).rejects.toThrow(/Unsupported delta metric/);
  });
});

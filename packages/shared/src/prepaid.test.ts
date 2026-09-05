import { describe, expect, it } from "vitest";
import { priceUsageIdr } from "./schemas.js";

describe("priceUsageIdr", () => {
  it("prices electricity per kWh", () => {
    expect(
      priceUsageIdr({ energyKwh: 2, waterLiters: 0, electricityTariffPerKwh: 1444.7, waterTariffPerM3: 18000 })
    ).toBeCloseTo(2889.4, 4);
  });

  it("converts litres to m³ for water", () => {
    // 500 L = 0.5 m³ × 18000 = 9000
    expect(
      priceUsageIdr({ energyKwh: 0, waterLiters: 500, electricityTariffPerKwh: 1444.7, waterTariffPerM3: 18000 })
    ).toBeCloseTo(9000, 4);
  });

  it("sums both utilities and ignores negative deltas", () => {
    expect(
      priceUsageIdr({ energyKwh: -5, waterLiters: 1000, electricityTariffPerKwh: 1000, waterTariffPerM3: 20000 })
    ).toBeCloseTo(20000, 4);
  });
});

import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatNumber,
  isValidEmail,
  isValidPhone,
  maskEmail,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats IDR without decimals", () => {
    expect(formatCurrency(245000)).toContain("245.000");
  });
});

describe("formatNumber", () => {
  it("uses a comma as the decimal separator (id-ID)", () => {
    expect(formatNumber(4.82, 2)).toBe("4,82");
  });
});

describe("isValidEmail", () => {
  it("accepts a valid address", () => {
    expect(isValidEmail("kevin@gmail.com")).toBe(true);
  });
  it("rejects an invalid address", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts an Indonesian mobile number", () => {
    expect(isValidPhone("081234567890")).toBe(true);
  });
  it("rejects a malformed number", () => {
    expect(isValidPhone("123")).toBe(false);
  });
});

describe("maskEmail", () => {
  it("masks the local part", () => {
    expect(maskEmail("kevin@gmail.com")).toBe("ke***@gmail.com");
  });
});

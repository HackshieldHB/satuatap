import { describe, it, expect } from "vitest";
import { computeActive } from "@/lib/nav";

describe("computeActive", () => {
  it("activates the section but not its query-string shortcuts", () => {
    expect(computeActive("/devices", "/devices")).toBe(true);
    expect(computeActive("/devices?filter=energy", "/devices")).toBe(false);
    expect(computeActive("/devices?filter=water", "/devices")).toBe(false);
  });

  it("does not over-match sibling routes", () => {
    expect(computeActive("/devices", "/services")).toBe(false);
  });

  it("matches nested routes", () => {
    expect(computeActive("/rooms", "/rooms/room-1")).toBe(true);
  });

  it("home matches only the exact root", () => {
    expect(computeActive("/", "/")).toBe(true);
    expect(computeActive("/", "/devices")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { computeActive, MAIN_NAV, MOBILE_NAV, navForRole } from "@/lib/nav";

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

describe("navForRole", () => {
  const hrefs = (role: Parameters<typeof navForRole>[1]) =>
    navForRole(MAIN_NAV, role).map((i) => i.href);

  it("keeps manager and resident menus distinct", () => {
    const manager = hrefs("manager");
    const resident = hrefs("resident");
    expect(manager).toContain("/manage");
    expect(manager).not.toContain("/payments");
    expect(resident).toContain("/payments");
    expect(resident).toContain("/rooms");
    expect(resident).not.toContain("/manage");
    expect(resident).not.toContain("/alerts");
  });

  it("defaults a missing role to resident, not the full menu", () => {
    expect(hrefs(undefined)).toEqual(hrefs("resident"));
    expect(hrefs(undefined)).not.toContain("/manage");
  });

  it("filters mobile nav per role", () => {
    const mobile = (role: Parameters<typeof navForRole>[1]) =>
      navForRole(MOBILE_NAV, role).map((i) => i.href);
    expect(mobile("manager")).toContain("/alerts");
    expect(mobile("manager")).not.toContain("/payments");
    expect(mobile("resident")).toContain("/payments");
    expect(mobile("resident")).not.toContain("/alerts");
    expect(mobile("operator")).toContain("/operator");
    expect(mobile("operator")).not.toContain("/ai");
  });
});

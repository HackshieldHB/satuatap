import { describe, it, expect } from "vitest";
import {
  MENU_CATALOG,
  MENU_KEYS,
  defaultMenuVisibility,
  effectiveMenuVisibility,
  isMenuKey,
  isAppRole,
} from "./menus.js";

describe("menu catalog", () => {
  it("has unique keys and includes the admin console", () => {
    expect(new Set(MENU_KEYS).size).toBe(MENU_KEYS.length);
    expect(MENU_KEYS).toContain("admin");
    expect(isMenuKey("energy")).toBe(true);
    expect(isMenuKey("nope")).toBe(false);
  });

  it("admin sees everything by default; residents don't see manager menus", () => {
    const admin = defaultMenuVisibility("admin");
    expect(Object.values(admin).every((v) => v === true)).toBe(true);

    const resident = defaultMenuVisibility("resident");
    expect(resident.energy).toBe(true); // resident menu
    expect(resident.manage).toBe(false); // manager-only
    expect(resident.admin).toBe(false); // admin-only
  });

  it("overrides win over defaults", () => {
    const eff = effectiveMenuVisibility("resident", { manage: true, energy: false });
    expect(eff.manage).toBe(true); // turned on by admin
    expect(eff.energy).toBe(false); // turned off by admin
    expect(eff.water).toBe(true); // untouched default
  });

  it("never lets an admin hide the admin console from admins", () => {
    const eff = effectiveMenuVisibility("admin", { admin: false });
    expect(eff.admin).toBe(true);
  });

  it("recognises valid roles", () => {
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("resident")).toBe(true);
    expect(isAppRole("ghost")).toBe(false);
  });
});

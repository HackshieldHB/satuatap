// ─── App roles & the menu catalog ────────────────────────────────────────────
//
// The menu *catalog* (which pages exist, their stable keys and default per-role
// visibility) lives in code — a menu can only point at a route that actually
// exists, so an admin can never invent a page from the UI. What the admin DOES
// control, at runtime, is the role→menu *visibility* policy, stored per role in
// the `MenuVisibility` table; the effective menu = these defaults merged with
// whatever the admin has overridden. `admin` is the app-level administrator and
// sees every menu by default.

export const APP_ROLES = ["resident", "manager", "operator", "admin"] as const;
export type AppRoleName = (typeof APP_ROLES)[number];

export interface MenuCatalogItem {
  /** Stable id used as the DB key and the client nav key. */
  key: string;
  /** Human label for the admin matrix UI. */
  label: string;
  /** Roles that see this menu by default (before any admin override). */
  defaultRoles: AppRoleName[];
}

const RES: AppRoleName = "resident";
const MGR: AppRoleName = "manager";
const OP: AppRoleName = "operator";
const EVERYONE: AppRoleName[] = ["resident", "manager", "operator"];

// Mirrors the default persona mapping the app shipped with (see web src/lib/nav).
// `admin` is intentionally omitted here — admins default to seeing everything
// via defaultMenuVisibility() below, so we don't have to repeat it on each row.
export const MENU_CATALOG: MenuCatalogItem[] = [
  { key: "home", label: "Beranda", defaultRoles: EVERYONE },
  { key: "manage", label: "Pengelola", defaultRoles: [MGR] },
  { key: "operator", label: "Maintenance", defaultRoles: [OP, MGR] },
  { key: "compare", label: "Bandingkan", defaultRoles: [MGR] },
  { key: "devices", label: "Perangkat", defaultRoles: EVERYONE },
  { key: "rooms", label: "Ruangan", defaultRoles: [RES] },
  { key: "environment", label: "Lingkungan", defaultRoles: [RES, MGR] },
  { key: "energy", label: "Energi", defaultRoles: [RES, MGR] },
  { key: "water", label: "Air", defaultRoles: [RES, MGR] },
  { key: "alerts", label: "Peringatan", defaultRoles: [MGR, OP] },
  { key: "ai", label: "Otomatisasi", defaultRoles: [RES, MGR] },
  { key: "insights", label: "Wawasan AI", defaultRoles: [RES, MGR] },
  { key: "system", label: "Sistem", defaultRoles: [MGR, OP] },
  { key: "access", label: "Akses & Tamu", defaultRoles: [RES] },
  { key: "community", label: "Komunitas", defaultRoles: [RES, MGR] },
  { key: "amenities", label: "Fasilitas", defaultRoles: [RES] },
  { key: "parcels", label: "Paket & Loker", defaultRoles: [RES] },
  { key: "services", label: "Layanan", defaultRoles: [RES] },
  { key: "kiosk", label: "Kios", defaultRoles: [RES, MGR] },
  { key: "prepaid", label: "Prabayar", defaultRoles: [RES] },
  { key: "invoices", label: "Tagihan", defaultRoles: [RES] },
  { key: "payments", label: "Pembayaran", defaultRoles: [RES] },
  { key: "notifications", label: "Notifikasi", defaultRoles: EVERYONE },
  { key: "telegram", label: "Telegram", defaultRoles: EVERYONE },
  { key: "admin", label: "Administrasi", defaultRoles: [] }, // admin-only (via the admin default below)
];

export const MENU_KEYS: string[] = MENU_CATALOG.map((m) => m.key);

export function isMenuKey(key: string): boolean {
  return MENU_KEYS.includes(key);
}

export function isAppRole(role: string): role is AppRoleName {
  return (APP_ROLES as readonly string[]).includes(role);
}

/** Default visibility map for a role. Admins see everything by default. */
export function defaultMenuVisibility(role: AppRoleName): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const item of MENU_CATALOG) {
    out[item.key] = role === "admin" ? true : item.defaultRoles.includes(role);
  }
  return out;
}

/**
 * Merge admin overrides on top of the code defaults for one role. `overrides`
 * is the subset the admin has explicitly set (menuKey → visible).
 */
export function effectiveMenuVisibility(
  role: AppRoleName,
  overrides: Record<string, boolean>
): Record<string, boolean> {
  const base = defaultMenuVisibility(role);
  for (const key of MENU_KEYS) {
    if (key in overrides) base[key] = overrides[key];
  }
  // Safety net: an admin can never hide the admin console from admins and lock
  // themselves out of the very screen that manages menus.
  if (role === "admin") base["admin"] = true;
  return base;
}

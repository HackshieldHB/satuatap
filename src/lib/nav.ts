import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/types";
import {
  Home,
  Cpu,
  DoorOpen,
  Bot,
  Zap,
  Droplets,
  Thermometer,
  Bell,
  Activity,
  Server,
  LayoutGrid,
  CreditCard,
  Settings,
  User,
  Sparkles,
  Building2,
  Store,
  Wallet,
  Receipt,
  ClipboardList,
  KeyRound,
  Megaphone,
  CalendarCheck,
  Package,
  Send,
  Wrench,
  ShieldCheck,
} from "lucide-react";

// `key` is the stable id shared with the backend menu-visibility policy.
// `roles` is the built-in default persona mapping, used as a fallback when the
// admin-configured menu policy hasn't loaded (offline/degraded); omitted =
// visible to everyone.
export type NavItem = { key: string; href: string; label: string; icon: LucideIcon; roles?: AppRole[] };

const RESIDENT: AppRole[] = ["resident"];
const MANAGER: AppRole[] = ["manager"];
const RES_MGR: AppRole[] = ["resident", "manager"];
const MGR_OP: AppRole[] = ["manager", "operator"];
const OPERATOR: AppRole[] = ["operator", "manager"];
const ADMIN: AppRole[] = ["admin"];

export const MAIN_NAV: NavItem[] = [
  { key: "home", href: "/", label: "Beranda", icon: Home },
  // Manager / operator
  { key: "manage", href: "/manage", label: "Pengelola", icon: ClipboardList, roles: MANAGER },
  { key: "operator", href: "/operator", label: "Maintenance", icon: Wrench, roles: OPERATOR },
  { key: "compare", href: "/compare", label: "Bandingkan", icon: Building2, roles: MANAGER },
  // Monitoring
  { key: "devices", href: "/devices", label: "Perangkat", icon: Cpu },
  { key: "rooms", href: "/rooms", label: "Ruangan", icon: DoorOpen, roles: RESIDENT },
  { key: "environment", href: "/environment", label: "Lingkungan", icon: Thermometer, roles: RES_MGR },
  { key: "energy", href: "/energy", label: "Energi", icon: Zap, roles: RES_MGR },
  { key: "water", href: "/water", label: "Air", icon: Droplets, roles: RES_MGR },
  { key: "alerts", href: "/alerts", label: "Peringatan", icon: Bell, roles: MGR_OP },
  { key: "ai", href: "/ai", label: "Otomatisasi", icon: Bot, roles: RES_MGR },
  { key: "insights", href: "/insights", label: "Wawasan AI", icon: Sparkles, roles: RES_MGR },
  { key: "system", href: "/system", label: "Sistem", icon: Server, roles: MGR_OP },
  // Resident services
  { key: "access", href: "/access", label: "Akses & Tamu", icon: KeyRound, roles: RESIDENT },
  { key: "community", href: "/community", label: "Komunitas", icon: Megaphone, roles: RES_MGR },
  { key: "amenities", href: "/amenities", label: "Fasilitas", icon: CalendarCheck, roles: RESIDENT },
  { key: "parcels", href: "/parcels", label: "Paket & Loker", icon: Package, roles: RESIDENT },
  { key: "services", href: "/services", label: "Layanan", icon: LayoutGrid, roles: RESIDENT },
  { key: "kiosk", href: "/kiosk", label: "Kios (Operator)", icon: Store, roles: RES_MGR },
  { key: "prepaid", href: "/prepaid", label: "Prabayar", icon: Wallet, roles: RESIDENT },
  { key: "invoices", href: "/invoices", label: "Tagihan", icon: Receipt, roles: RESIDENT },
  { key: "payments", href: "/payments", label: "Pembayaran", icon: CreditCard, roles: RESIDENT },
  // Common
  { key: "notifications", href: "/notifications", label: "Notifikasi", icon: Activity },
  { key: "telegram", href: "/telegram", label: "Telegram", icon: Send },
  // App administration
  { key: "admin", href: "/admin", label: "Administrasi", icon: ShieldCheck, roles: ADMIN },
];

export const BOTTOM_NAV: NavItem[] = [
  { key: "settings", href: "/settings", label: "Pengaturan", icon: Settings },
  { key: "profile", href: "/profile", label: "Profil", icon: User },
];

export const MOBILE_NAV: NavItem[] = [
  { key: "home", href: "/", label: "Beranda", icon: Home },
  { key: "devices", href: "/devices", label: "Perangkat", icon: Cpu },
  { key: "alerts", href: "/alerts", label: "Alert", icon: Bell, roles: MGR_OP },
  { key: "payments", href: "/payments", label: "Bayar", icon: CreditCard, roles: RESIDENT },
  { key: "ai", href: "/ai", label: "AI", icon: Sparkles, roles: RES_MGR },
  { key: "operator", href: "/operator", label: "Maint.", icon: Wrench, roles: ["operator"] },
  { key: "admin", href: "/admin", label: "Admin", icon: ShieldCheck, roles: ADMIN },
  { key: "profile", href: "/profile", label: "Profil", icon: User },
];

const KNOWN_ROLES: AppRole[] = ["resident", "manager", "operator", "admin"];

/**
 * Filter nav items for a persona using the built-in default mapping. A missing/
 * unknown role defaults to resident so manager-only items never leak. Used as
 * the fallback when the admin-configured menu policy is unavailable.
 */
export function navForRole(items: NavItem[], role: AppRole | null | undefined): NavItem[] {
  const persona: AppRole = role && KNOWN_ROLES.includes(role) ? role : "resident";
  return items.filter((i) => !i.roles || i.roles.includes(persona));
}

/**
 * Filter nav items by the admin-configured set of visible menu keys. Bottom-nav
 * items (settings/profile) aren't part of the policy, so anything without an
 * entry in `visibleKeys` falls through visible. `admin` is always kept for an
 * admin so they can't lock themselves out of the console.
 */
export function navByVisibleKeys(
  items: NavItem[],
  visibleKeys: Record<string, boolean>,
  role: AppRole | null | undefined
): NavItem[] {
  return items.filter((i) => {
    if (role === "admin" && i.key === "admin") return true;
    if (i.key in visibleKeys) return visibleKeys[i.key];
    return true; // items outside the policy (e.g. settings/profile) stay visible
  });
}

/**
 * Determine whether a nav item should render as active for the current path.
 *
 * A nav item is active when the current path matches its base route.
 * Query-string shortcuts (e.g. `/devices?filter=energy`) are just filtered
 * entry points into an existing section — they must NOT claim their own
 * highlight, otherwise several items light up at once for the same page.
 */
export function computeActive(href: string, pathname: string): boolean {
  const base = href.split("?")[0];
  if (base === "/") return pathname === "/";
  if (href.includes("?")) return false;
  return pathname === base || pathname.startsWith(base + "/");
}

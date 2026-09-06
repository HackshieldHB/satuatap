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
} from "lucide-react";

// `roles` limits an item to those personas; omitted = visible to everyone.
export type NavItem = { href: string; label: string; icon: LucideIcon; roles?: AppRole[] };

const RESIDENT: AppRole[] = ["resident"];
const MANAGER: AppRole[] = ["manager"];
const RES_MGR: AppRole[] = ["resident", "manager"];
const MGR_OP: AppRole[] = ["manager", "operator"];
const OPERATOR: AppRole[] = ["operator", "manager"];

export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Beranda", icon: Home },
  // Manager / operator
  { href: "/manage", label: "Pengelola", icon: ClipboardList, roles: MANAGER },
  { href: "/operator", label: "Maintenance", icon: Wrench, roles: OPERATOR },
  { href: "/compare", label: "Bandingkan", icon: Building2, roles: MANAGER },
  // Monitoring
  { href: "/devices", label: "Perangkat", icon: Cpu },
  { href: "/rooms", label: "Ruangan", icon: DoorOpen, roles: RESIDENT },
  { href: "/environment", label: "Lingkungan", icon: Thermometer, roles: RES_MGR },
  { href: "/energy", label: "Energi", icon: Zap, roles: RES_MGR },
  { href: "/water", label: "Air", icon: Droplets, roles: RES_MGR },
  { href: "/alerts", label: "Peringatan", icon: Bell, roles: MGR_OP },
  { href: "/ai", label: "Otomatisasi", icon: Bot, roles: RES_MGR },
  { href: "/insights", label: "Wawasan AI", icon: Sparkles, roles: RES_MGR },
  { href: "/system", label: "Sistem", icon: Server, roles: MGR_OP },
  // Resident services
  { href: "/access", label: "Akses & Tamu", icon: KeyRound, roles: RESIDENT },
  { href: "/community", label: "Komunitas", icon: Megaphone, roles: RES_MGR },
  { href: "/amenities", label: "Fasilitas", icon: CalendarCheck, roles: RESIDENT },
  { href: "/parcels", label: "Paket & Loker", icon: Package, roles: RESIDENT },
  { href: "/services", label: "Layanan", icon: LayoutGrid, roles: RESIDENT },
  { href: "/kiosk", label: "Kios (Operator)", icon: Store, roles: RES_MGR },
  { href: "/prepaid", label: "Prabayar", icon: Wallet, roles: RESIDENT },
  { href: "/invoices", label: "Tagihan", icon: Receipt, roles: RESIDENT },
  { href: "/payments", label: "Pembayaran", icon: CreditCard, roles: RESIDENT },
  // Common
  { href: "/notifications", label: "Notifikasi", icon: Activity },
  { href: "/telegram", label: "Telegram", icon: Send },
];

export const BOTTOM_NAV: NavItem[] = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/profile", label: "Profil", icon: User },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/devices", label: "Perangkat", icon: Cpu },
  { href: "/alerts", label: "Alert", icon: Bell },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/profile", label: "Profil", icon: User },
];

/**
 * Filter nav items for a persona. A missing role (e.g. a session created before
 * roles existed) shows everything, so no menu ever silently vanishes.
 */
export function navForRole(items: NavItem[], role: AppRole | null | undefined): NavItem[] {
  if (!role) return items;
  return items.filter((i) => !i.roles || i.roles.includes(role));
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

import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/devices", label: "Perangkat", icon: Cpu },
  { href: "/rooms", label: "Ruangan", icon: DoorOpen },
  { href: "/environment", label: "Lingkungan", icon: Thermometer },
  { href: "/energy", label: "Energi", icon: Zap },
  { href: "/water", label: "Air", icon: Droplets },
  { href: "/alerts", label: "Peringatan", icon: Bell },
  { href: "/ai", label: "Otomatisasi", icon: Bot },
  { href: "/insights", label: "Wawasan AI", icon: Sparkles },
  { href: "/system", label: "Sistem", icon: Server },
  { href: "/access", label: "Akses & Tamu", icon: KeyRound },
  { href: "/community", label: "Komunitas", icon: Megaphone },
  { href: "/amenities", label: "Fasilitas", icon: CalendarCheck },
  { href: "/parcels", label: "Paket & Loker", icon: Package },
  { href: "/compare", label: "Bandingkan", icon: Building2 },
  { href: "/services", label: "Layanan", icon: LayoutGrid },
  { href: "/kiosk", label: "Kios (Operator)", icon: Store },
  { href: "/prepaid", label: "Prabayar", icon: Wallet },
  { href: "/invoices", label: "Tagihan", icon: Receipt },
  { href: "/manage", label: "Pengelola", icon: ClipboardList },
  { href: "/payments", label: "Pembayaran", icon: CreditCard },
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

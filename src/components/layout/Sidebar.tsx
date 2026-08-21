"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Cpu,
  Sparkles,
  LayoutGrid,
  User,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
  Zap,
  Droplets,
  DoorOpen,
  Bot,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeActive } from "@/lib/nav";
import { Logo } from "./Logo";
import { useState } from "react";

const mainNavItems = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/devices", label: "Perangkat", icon: Cpu },
  { href: "/rooms", label: "Ruangan", icon: DoorOpen },
  { href: "/ai", label: "Otomatisasi", icon: Bot },
  { href: "/energy", label: "Energi", icon: Zap },
  { href: "/water", label: "Air", icon: Droplets },
  { href: "/services", label: "Layanan", icon: LayoutGrid },
  { href: "/payments", label: "Pembayaran", icon: CreditCard },
  { href: "/notifications", label: "Notifikasi", icon: Bell },
];

const bottomNavItems = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/profile", label: "Profil", icon: User },
];

const mobileNavItems = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/devices", label: "Perangkat", icon: Cpu },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/services", label: "Layanan", icon: LayoutGrid },
  { href: "/profile", label: "Profil", icon: User },
];


export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => computeActive(href, pathname);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-surface border-r border-border transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && <Logo size="sm" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="touch-target flex items-center justify-center rounded-md hover:bg-background text-muted"
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-background hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2 space-y-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-background hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => computeActive(href, pathname);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border pb-safe-bottom"
      aria-label="Navigasi utama"
    >
      <div className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1 touch-target",
                active ? "text-primary" : "text-muted"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

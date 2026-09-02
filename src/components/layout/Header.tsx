"use client";

import Link from "next/link";
import { Bell, ChevronDown, Building2, Check } from "lucide-react";
import { Logo } from "./Logo";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useHomes } from "@/hooks/useHomes";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const { user, session, updateSelectedHome } = useAuth();
  const { unreadCount } = useNotifications();
  const homes = useHomes();
  const [showHomePicker, setShowHomePicker] = useState(false);

  const selectedHomeId = session?.selectedHomeId || "home-1";
  const selectedHome = homes.find((h) => h.id === selectedHomeId) || homes[0];

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-border pt-safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <Logo size="sm" />

          <button
            onClick={() => setShowHomePicker(true)}
            className="flex items-center gap-1.5 rounded-md bg-background px-3 py-1.5 text-sm font-medium max-w-[140px]"
            aria-label="Pilih rumah"
          >
            <span className="truncate">{selectedHome.name}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
          </button>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/notifications"
              className="touch-target flex items-center justify-center text-muted hover:text-foreground relative"
              aria-label="Notifikasi"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/profile" aria-label="Profil">
              <Avatar name={user?.fullName || "User"} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <BottomSheet
        isOpen={showHomePicker}
        onClose={() => setShowHomePicker(false)}
        title="Pilih Rumah"
      >
        <div className="space-y-2">
          {homes.map((home) => (
            <button
              key={home.id}
              onClick={() => {
                updateSelectedHome(home.id);
                setShowHomePicker(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg p-4 text-left transition-colors",
                selectedHomeId === home.id
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-background hover:bg-background/80"
              )}
            >
              <span className="text-2xl" aria-hidden>
                {home.type === "villa" ? "🏡" : "🏠"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{home.name}</p>
                <p className="text-xs text-muted">
                  {home.deviceCount} perangkat · {home.location}
                </p>
              </div>
            </button>
          ))}
          <Link
            href="/homes"
            onClick={() => setShowHomePicker(false)}
            className="block w-full text-center py-3 text-sm font-medium text-primary"
          >
            Kelola Rumah
          </Link>
        </div>
      </BottomSheet>
    </>
  );
}

export function DesktopHeader() {
  const { user, session, updateSelectedHome } = useAuth();
  const { unreadCount } = useNotifications();
  const homes = useHomes();
  const [open, setOpen] = useState(false);

  const selectedHomeId = session?.selectedHomeId || "home-1";
  const selectedHome = homes.find((h) => h.id === selectedHomeId) || homes[0];

  return (
    <header className="hidden lg:flex items-center justify-between gap-4 h-16 px-6 border-b border-border bg-surface">
      {/* Building switcher — manage every building from one screen */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md bg-background px-3 py-1.5 text-sm font-medium hover:bg-background/70"
        >
          <Building2 className="h-4 w-4 text-primary" />
          <span className="truncate max-w-[180px]">{selectedHome?.name}</span>
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-40 w-64 rounded-lg border border-border bg-surface shadow-card p-1">
              {homes.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    updateSelectedHome(h.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    h.id === selectedHomeId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-background"
                  )}
                >
                  <span aria-hidden>🏢</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{h.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {h.location || `${h.deviceCount} perangkat`}
                    </span>
                  </span>
                  {h.id === selectedHomeId && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}
              <Link
                href="/compare"
                onClick={() => setOpen(false)}
                className="mt-1 block w-full border-t border-border py-2 text-center text-sm font-medium text-primary"
              >
                Bandingkan gedung →
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
      <Link
        href="/notifications"
        className="touch-target flex items-center justify-center text-muted hover:text-foreground relative"
        aria-label="Notifikasi"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
      <Link href="/profile" className="flex items-center gap-2">
        <Avatar name={user?.fullName || "User"} size="sm" />
        <span className="text-sm font-medium">{user?.fullName}</span>
      </Link>
      </div>
    </header>
  );
}

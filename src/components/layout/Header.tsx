"use client";

import Link from "next/link";
import { Bell, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { MOCK_HOMES } from "@/data/mock";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const { user, session, updateSelectedHome } = useAuth();
  const { unreadCount } = useNotifications();
  const [showHomePicker, setShowHomePicker] = useState(false);

  const selectedHomeId = session?.selectedHomeId || "home-1";
  const selectedHome = MOCK_HOMES.find((h) => h.id === selectedHomeId) || MOCK_HOMES[0];

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
          {MOCK_HOMES.map((home) => (
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
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <header className="hidden lg:flex items-center justify-end gap-4 h-16 px-6 border-b border-border bg-surface">
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
    </header>
  );
}

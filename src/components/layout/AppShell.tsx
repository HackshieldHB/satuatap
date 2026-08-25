"use client";

import { useEffect, useState } from "react";
import { Sidebar, BottomNav } from "./Sidebar";
import { MobileHeader, DesktopHeader } from "./Header";
import { OfflineBanner } from "@/components/ui/ErrorState";
import { ToastContainer } from "@/components/ui/Toast";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { LiveSimulation } from "@/components/system/LiveSimulation";
import { SosButton } from "@/components/system/SosButton";
import { useOffline } from "@/hooks/useOffline";
import { isLocalMode, subscribeLocalMode } from "@/lib/local-mode";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isOffline = useOffline();
  const [localMode, setLocal] = useState(false);

  useEffect(() => {
    setLocal(isLocalMode());
    return subscribeLocalMode(() => setLocal(isLocalMode()));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {isOffline && <OfflineBanner />}
      {localMode && (
        <div
          className={cn(
            "fixed left-0 right-0 z-50 bg-primary text-white px-4 py-2 text-center text-sm font-medium",
            isOffline ? "top-10" : "top-0"
          )}
          role="status"
        >
          Mode lokal
        </div>
      )}
      <Sidebar />
      <div className="lg:pl-[260px] min-h-screen flex flex-col">
        <MobileHeader />
        <DesktopHeader />
        <main
          className={cn(
            "flex-1 px-4 py-4 lg:px-6 lg:py-6",
            "pb-24 lg:pb-6",
            isOffline && "pt-10",
            localMode && (isOffline ? "pt-20" : "pt-10")
          )}
        >
          {children}
        </main>
      </div>
      <BottomNav />
      <AssistantWidget />
      <SosButton />
      <LiveSimulation />
      <ToastContainer />
    </div>
  );
}

"use client";

import { Sidebar, BottomNav } from "./Sidebar";
import { MobileHeader, DesktopHeader } from "./Header";
import { OfflineBanner } from "@/components/ui/ErrorState";
import { ToastContainer } from "@/components/ui/Toast";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { LiveSimulation } from "@/components/system/LiveSimulation";
import { SosButton } from "@/components/system/SosButton";
import { useOffline } from "@/hooks/useOffline";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isOffline = useOffline();

  return (
    <div className="min-h-screen bg-background">
      {isOffline && <OfflineBanner />}
      <Sidebar />
      <div className="lg:pl-[260px] min-h-screen flex flex-col">
        <MobileHeader />
        <DesktopHeader />
        <main
          className={cn(
            "flex-1 px-4 py-4 lg:px-6 lg:py-6",
            "pb-24 lg:pb-6",
            isOffline && "pt-10"
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

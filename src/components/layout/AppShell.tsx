"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Sidebar, BottomNav } from "./Sidebar";
import { MobileHeader, DesktopHeader } from "./Header";
import { OfflineBanner } from "@/components/ui/ErrorState";
import { ToastContainer } from "@/components/ui/Toast";
import { SosButton } from "@/components/system/SosButton";
import { useOffline } from "@/hooks/useOffline";
import { isLocalMode, subscribeLocalMode } from "@/lib/local-mode";
import { cn } from "@/lib/utils";

const AssistantWidget = dynamic(
  () => import("@/components/assistant/AssistantWidget").then((m) => ({ default: m.AssistantWidget })),
  { ssr: false }
);
const LiveSimulation = dynamic(
  () => import("@/components/system/LiveSimulation").then((m) => ({ default: m.LiveSimulation })),
  { ssr: false }
);

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isOffline = useOffline();
  const pathname = usePathname();
  const [localMode, setLocal] = useState(false);

  useEffect(() => {
    setLocal(isLocalMode());
    return subscribeLocalMode(() => setLocal(isLocalMode()));
  }, []);

  return (
    <div className="min-h-screen isolate">
      {/* Botanical decorative accent (behind content, desktop only) — reference feel. */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 -z-10 hidden h-60 w-60 opacity-90 lg:left-[236px] lg:block"
        style={{
          backgroundImage: "url('/assets/27-leaves-bottom.png')",
          backgroundSize: "contain",
          backgroundPosition: "bottom left",
          backgroundRepeat: "no-repeat",
          WebkitMaskImage:
            "radial-gradient(130% 120% at 22% 82%, #000 42%, transparent 74%)",
          maskImage:
            "radial-gradient(130% 120% at 22% 82%, #000 42%, transparent 74%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -right-8 top-16 -z-10 hidden h-52 w-52 opacity-70 xl:block"
        style={{
          backgroundImage: "url('/assets/08-leaves.png')",
          backgroundSize: "contain",
          backgroundPosition: "top right",
          backgroundRepeat: "no-repeat",
          WebkitMaskImage:
            "radial-gradient(120% 120% at 78% 22%, #000 40%, transparent 72%)",
          maskImage:
            "radial-gradient(120% 120% at 78% 22%, #000 40%, transparent 72%)",
        }}
      />
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
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
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

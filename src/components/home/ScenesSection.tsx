"use client";

import { useState } from "react";
import { SCENES } from "@/data/mock";
import { automationService } from "@/services/automation.service";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  Home,
  Moon,
  Leaf,
  Clapperboard,
  Check,
  Loader2,
  Wand2,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  house: Home,
  moon: Moon,
  leaf: Leaf,
  clapperboard: Clapperboard,
};

export function ScenesSection() {
  const { showToast } = useToast();
  const [activating, setActivating] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState<string | null>(null);

  const activate = async (id: string) => {
    if (activating) return;
    setActivating(id);
    const res = await automationService.activateScene(id);
    setActivating(null);
    if (res.success && res.data) {
      setActiveScene(id);
      showToast(
        `${res.data.name} aktif · ${res.data.updated} perangkat diperbarui`,
        "success"
      );
    } else {
      showToast(res.error || "Gagal menjalankan skenario.", "error");
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-base font-semibold">
          <Wand2 className="h-4 w-4 text-primary" />
          Skenario
        </h2>
        <span className="text-xs text-muted">Satu ketuk untuk semua</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SCENES.map((scene, i) => {
          const Icon = iconMap[scene.icon] || Home;
          const isActivating = activating === scene.id;
          const isActive = activeScene === scene.id;
          return (
            <button
              key={scene.id}
              onClick={() => activate(scene.id)}
              disabled={!!activating}
              style={{ animationDelay: `${i * 60}ms` }}
              className={cn(
                "group relative overflow-hidden rounded-xl bg-gradient-to-br p-4 text-left text-white shadow-card transition-all duration-200 animate-pop-in",
                "hover:-translate-y-1 hover:shadow-floating active:scale-95 disabled:opacity-80",
                scene.gradient
              )}
            >
              <span
                className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/15 blur-xl"
                aria-hidden
              />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                {isActivating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isActive ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                )}
              </div>
              <p className="relative mt-3 text-sm font-semibold">{scene.name}</p>
              <p className="relative text-[11px] text-white/80 line-clamp-1">
                {scene.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

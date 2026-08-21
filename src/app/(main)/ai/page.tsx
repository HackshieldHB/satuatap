"use client";

import { useEffect, useMemo, useState } from "react";
import { aiService } from "@/services/ai.service";
import { adService } from "@/services/ad.service";
import { useAuth } from "@/hooks/useAuth";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, cn } from "@/lib/utils";
import { Sparkles, PiggyBank, Lightbulb, Gauge } from "lucide-react";
import type { AIInsight, AIInsightCategory, Advertisement } from "@/types";

const CATEGORY_LABELS: Record<AIInsightCategory, string> = {
  energy: "Energi",
  water: "Air",
  cost: "Biaya",
  security: "Keamanan",
  automation: "Otomatisasi",
  comfort: "Kenyamanan",
};

export default function AIPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCat, setActiveCat] = useState<AIInsightCategory | "all">("all");

  const loadData = async () => {
    setLoading(true);
    setError(false);
    const [insightResult, adResult] = await Promise.all([
      aiService.getInsights(homeId),
      adService.getAdsByPlacement("HOME_RECOMMENDATION"),
    ]);
    if (insightResult.success && insightResult.data)
      setInsights(insightResult.data);
    else setError(true);
    if (adResult.success && adResult.data) setAds(adResult.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId]);

  const totalSaving = useMemo(
    () => insights.reduce((sum, i) => sum + (i.potentialSaving ?? 0), 0),
    [insights]
  );
  const efficiency = useMemo(() => {
    const attention = insights.filter((i) => i.severity === "attention").length;
    return Math.max(60, 100 - attention * 6);
  }, [insights]);

  const categories = useMemo(() => {
    const set = new Set<AIInsightCategory>();
    insights.forEach((i) => i.category && set.add(i.category));
    return Array.from(set);
  }, [insights]);

  const visible = insights.filter(
    (i) => activeCat === "all" || i.category === activeCat
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-hero ai-gradient border border-secondary/20 p-5 animate-pop-in">
        <span
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-secondary/20 blur-2xl"
          aria-hidden
        />
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface shadow-card">
            <Sparkles className="h-6 w-6 text-secondary animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI SATU ATAP</h1>
            <p className="text-sm text-muted">
              Asisten pintar yang menganalisis rumahmu setiap hari
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <HeroStat
            icon={<PiggyBank className="h-4 w-4 text-success" />}
            value={loading ? "…" : formatCurrency(totalSaving)}
            label="Potensi hemat/bln"
          />
          <HeroStat
            icon={<Lightbulb className="h-4 w-4 text-primary" />}
            value={loading ? "…" : `${insights.length}`}
            label="Insight aktif"
          />
          <HeroStat
            icon={<Gauge className="h-4 w-4 text-secondary" />}
            value={loading ? "…" : `${efficiency}`}
            label="Skor efisiensi"
          />
        </div>
      </div>

      {/* Category filter */}
      {!loading && !error && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
          <FilterChip
            active={activeCat === "all"}
            onClick={() => setActiveCat("all")}
          >
            Semua
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c}
              active={activeCat === c}
              onClick={() => setActiveCat(c)}
            >
              {CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}
      {error && !loading && (
        <ErrorState onRetry={loadData} message="Tidak dapat memuat insight AI." />
      )}
      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="Belum ada insight di kategori ini"
          description="Coba pilih kategori lain untuk melihat rekomendasi."
        />
      )}
      {!loading && !error && visible.length > 0 && (
        <div className="space-y-4">
          {visible.map((insight, i) => (
            <AIInsightCard key={insight.id} insight={insight} index={i} />
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Rekomendasi SATU ATAP</h2>
        <AdSlot ads={ads} />
      </section>
    </div>
  );
}

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-lg bg-surface/70 backdrop-blur-sm p-3">
      <div className="flex items-center gap-1">{icon}</div>
      <p className="text-sm font-bold mt-1 leading-tight truncate">{value}</p>
      <p className="text-[10px] text-muted mt-0.5">{label}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95",
        active
          ? "bg-secondary text-secondary-foreground shadow-card"
          : "bg-surface border border-border text-muted hover:text-foreground hover:border-secondary/40"
      )}
    >
      {children}
    </button>
  );
}

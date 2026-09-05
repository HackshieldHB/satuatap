"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { insightsService, type Insight, type LeaderboardRow } from "@/services/insights.service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, cn } from "@/lib/utils";
import { Sparkles, TrendingUp, Droplets, Plug, Trophy, Medal, ReceiptText } from "lucide-react";

const KIND_ICON = {
  forecast: ReceiptText,
  trend: TrendingUp,
  leak: Droplets,
  standby: Plug,
  benchmark: Trophy,
} as const;

const SEV_STYLE: Record<string, string> = {
  info: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  critical: "bg-danger/10 text-danger",
};

export default function InsightsPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [insights, setInsights] = useState<Insight[]>([]);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);

  const refresh = useCallback(async () => {
    if (!homeId) return;
    const [i, l] = await Promise.all([
      insightsService.getInsights(homeId),
      insightsService.getLeaderboard(homeId),
    ]);
    if (i.success && i.data) setInsights(i.data);
    if (l.success && l.data) setBoard(l.data);
  }, [homeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Wawasan AI</h1>
        <p className="text-sm text-muted">Perkiraan tagihan, deteksi anomali &amp; peringkat hemat.</p>
      </div>

      {/* Insights */}
      {insights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Belum cukup data"
          description="Wawasan muncul setelah ada cukup pemakaian listrik/air yang tercatat."
        />
      ) : (
        insights.map((ins) => {
          const Icon = KIND_ICON[ins.kind] ?? Sparkles;
          return (
            <Card key={ins.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("rounded-xl p-2", SEV_STYLE[ins.severity])}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{ins.title}</p>
                  <p className="text-sm text-muted">{ins.body}</p>
                  {ins.valueIdr != null && (
                    <p className="mt-1 text-2xl font-bold">{formatCurrency(ins.valueIdr)}</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}

      {/* Leaderboard */}
      {board.length > 0 && (
        <Card className="p-4">
          <p className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" /> Peringkat hemat gedung
          </p>
          <ul className="space-y-1.5">
            {board.map((r) => {
              const me = r.homeId === homeId;
              return (
                <li
                  key={r.homeId}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                    me ? "bg-primary/10 font-medium" : ""
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-center">
                      {r.rank <= 3 ? <Medal className="inline h-4 w-4 text-warning" /> : r.rank}
                    </span>
                    {r.name} {me && <span className="text-xs text-primary">(unit kamu)</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted">{r.kwh} kWh</span>
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                      eco {r.ecoScore}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { useHomes } from "@/hooks/useHomes";
import { homeService } from "@/services/home.service";
import type { DashboardData, Home } from "@/types";
import { Zap, Droplets, Wifi, Building2 } from "lucide-react";

interface Row {
  home: Home;
  data: DashboardData | null;
}

export default function ComparePage() {
  const homes = useHomes();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (homes.length === 0) return;
    let alive = true;
    setLoading(true);
    void Promise.all(
      homes.map(async (home) => {
        const res = await homeService.getDashboard(home.id);
        return { home, data: res.success && res.data ? res.data : null };
      })
    ).then((r) => {
      if (alive) {
        setRows(r);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [homes]);

  const metrics: {
    key: string;
    label: string;
    icon: typeof Zap;
    value: (d: DashboardData | null) => string;
  }[] = [
    { key: "kwh", label: "Listrik hari ini", icon: Zap, value: (d) => (d ? `${d.energy.todayKwh.toFixed(1)} kWh` : "—") },
    { key: "ecost", label: "Perkiraan biaya listrik", icon: Zap, value: (d) => (d ? formatCurrency(d.energy.estimatedCost) : "—") },
    { key: "liter", label: "Air hari ini", icon: Droplets, value: (d) => (d ? `${Math.round(d.water.todayLiters)} L` : "—") },
    { key: "wcost", label: "Perkiraan biaya air", icon: Droplets, value: (d) => (d ? formatCurrency(d.water.estimatedCost) : "—") },
    { key: "dev", label: "Perangkat online", icon: Wifi, value: (d) => (d ? `${d.devicesOnline}/${d.devicesOnline + d.devicesOffline}` : "—") },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Bandingkan Gedung
        </h1>
        <p className="text-sm text-muted">
          Konsumsi, biaya, dan status semua gedung dalam satu layar.
        </p>
      </div>

      {loading ? (
        <Card>
          <p className="text-sm text-muted">Memuat data gedung…</p>
        </Card>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `minmax(140px,1.2fr) repeat(${rows.length}, minmax(120px,1fr))` }}
        >
          {/* Header row */}
          <div />
          {rows.map(({ home }) => (
            <div key={home.id} className="rounded-lg bg-primary/5 px-3 py-2 text-center">
              <p className="truncate text-sm font-bold">{home.name}</p>
              <p className="truncate text-[11px] text-muted">{home.location || "—"}</p>
            </div>
          ))}

          {/* Metric rows */}
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <FragmentRow key={m.key}>
                <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-3 text-sm font-medium">
                  <Icon className="h-4 w-4 text-muted shrink-0" />
                  <span className="min-w-0 truncate">{m.label}</span>
                </div>
                {rows.map(({ home, data }) => (
                  <div
                    key={home.id}
                    className="flex items-center justify-center rounded-lg border border-border px-3 py-3 text-sm font-bold tabular-nums"
                  >
                    {m.value(data)}
                  </div>
                ))}
              </FragmentRow>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted">
        Gedung tanpa perangkat menampilkan “—”. Tambahkan node IoT ke gedung untuk
        melihat data live.
      </p>
    </div>
  );
}

// Grid children must be siblings, so a row is just its cells in order.
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

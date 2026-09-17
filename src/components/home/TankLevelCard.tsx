"use client";

import type { TankReading } from "@/services/telemetry.service";

/** Blue when healthy, amber when getting low, red when near-empty. */
function levelStyle(pct: number): { text: string; fill: string; label: string } {
  if (pct <= 20) return { text: "text-error", fill: "#EF7775", label: "Hampir habis" };
  if (pct <= 45) return { text: "text-warning", fill: "#F2A84B", label: "Menipis" };
  return { text: "text-info", fill: "#5CA7D5", label: "Aman" };
}

function sinceLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  return `${h} jam lalu`;
}

function Tank({ tank }: { tank: TankReading }) {
  const pct = tank.levelPct;
  const known = typeof pct === "number";
  const clamped = known ? Math.max(0, Math.min(100, pct)) : 0;
  const style = levelStyle(clamped);
  // SVG geometry: inner water area is y=8..92 (height 84).
  const top = 8 + (1 - clamped / 100) * 84;
  const height = (clamped / 100) * 84;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
      <svg viewBox="0 0 60 100" width="56" height="94" role="img" aria-label={`${tank.name} ${clamped}%`}>
        <rect x="6" y="6" width="48" height="88" rx="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" className="text-foreground" />
        {known && height > 0 && (
          <rect x="8" y={top} width="44" height={height} rx="6" fill={style.fill} fillOpacity="0.85" />
        )}
        {[30, 50, 70].map((y) => (
          <line key={y} x1="8" x2="52" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" className="text-foreground" />
        ))}
      </svg>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{tank.name}</p>
        <p className={`text-3xl font-bold tabular-nums ${style.text}`}>
          {known ? `${Math.round(clamped)}%` : "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {known ? style.label : "Belum ada data"}
          {typeof tank.distanceCm === "number" ? ` · ${tank.distanceCm.toFixed(1)} cm` : ""}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {tank.status === "offline" ? "Sensor offline" : `Diperbarui ${sinceLabel(tank.updatedAt)}`}
        </p>
      </div>
    </div>
  );
}

export function TankLevelCard({ tanks }: { tanks: TankReading[] }) {
  if (tanks.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Tandon Air</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tanks.map((t) => (
          <Tank key={t.deviceId} tank={t} />
        ))}
      </div>
    </section>
  );
}

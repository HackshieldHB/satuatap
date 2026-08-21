"use client";

import Link from "next/link";
import { BarChart } from "@/components/charts/BarChart";
import { Card } from "@/components/ui/Card";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

interface UsageDetailViewProps {
  title: string;
  icon: LucideIcon;
  accentText: string;
  gradient: string;
  today: string;
  unit: string;
  cost: number;
  comparisonPercent: number;
  comparisonDirection: "up" | "down";
  history: { label: string; value: number }[];
  breakdown: { name: string; percent: number; sub: string }[];
  forecast: string;
  tips: string[];
  extra?: React.ReactNode;
}

export function UsageDetailView({
  title,
  icon: Icon,
  accentText,
  gradient,
  today,
  unit,
  cost,
  comparisonPercent,
  comparisonDirection,
  history,
  breakdown,
  forecast,
  tips,
  extra,
}: UsageDetailViewProps) {
  const down = comparisonDirection === "down";

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Beranda
      </Link>

      {extra}

      <div
        className={cn(
          "relative overflow-hidden rounded-hero border border-border/50 bg-gradient-to-br p-5 animate-pop-in",
          gradient
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl bg-surface shadow-card",
              accentText
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-muted">Ringkasan 7 hari terakhir</p>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <p className="text-3xl font-bold">
            {today}
            <span className="ml-1 text-base font-medium text-muted">{unit}</span>
          </p>
          <div
            className={cn(
              "mb-1 flex items-center gap-1 text-xs font-medium",
              down ? "text-success" : "text-error"
            )}
          >
            {down ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5" />
            )}
            {comparisonPercent}% vs kemarin
          </div>
        </div>
        <p className="text-sm text-muted">
          Estimasi biaya hari ini:{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(cost)}
          </span>
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Tren 7 Hari</h2>
        <BarChart data={history} unit={unit} colorClass={accentText} />
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Rincian Penggunaan</h2>
        <div className="space-y-3">
          {breakdown.map((b) => (
            <div key={b.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{b.name}</span>
                <span className="text-muted">
                  {b.sub} · {b.percent}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
                <div
                  className={cn("h-full rounded-full", accentText)}
                  style={{ width: `${b.percent}%`, backgroundColor: "currentColor" }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="ai">
        <div className="mb-2 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-secondary" />
          <h2 className="text-base font-semibold">Perkiraan & Tips</h2>
        </div>
        <p className="text-sm text-muted">{forecast}</p>
        <ul className="mt-3 space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

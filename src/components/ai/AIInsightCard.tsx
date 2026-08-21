import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  ChevronRight,
  Zap,
  Droplets,
  Wallet,
  ShieldCheck,
  Bot,
  Check,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type {
  AIInsight,
  AIInsightCategory,
  AIInsightSeverity,
} from "@/types";

const categoryVisuals: Record<
  AIInsightCategory,
  { icon: LucideIcon; chip: string; label: string }
> = {
  energy: { icon: Zap, chip: "bg-warning/10 text-warning", label: "Energi" },
  water: { icon: Droplets, chip: "bg-info/10 text-info", label: "Air" },
  cost: { icon: Wallet, chip: "bg-primary/10 text-primary", label: "Biaya" },
  security: {
    icon: ShieldCheck,
    chip: "bg-error/10 text-error",
    label: "Keamanan",
  },
  automation: {
    icon: Bot,
    chip: "bg-secondary/10 text-secondary",
    label: "Otomatisasi",
  },
  comfort: {
    icon: Sparkles,
    chip: "bg-accent/20 text-accent-foreground",
    label: "Kenyamanan",
  },
};

const severityBadge: Record<
  AIInsightSeverity,
  { label: string; variant: "success" | "warning" | "info" }
> = {
  opportunity: { label: "Peluang", variant: "success" },
  attention: { label: "Perlu Perhatian", variant: "warning" },
  info: { label: "Info", variant: "info" },
};

interface AIInsightCardProps {
  insight: AIInsight;
  className?: string;
  compact?: boolean;
  index?: number;
}

export function AIInsightCard({
  insight,
  className,
  compact = false,
  index = 0,
}: AIInsightCardProps) {
  const visual = insight.category ? categoryVisuals[insight.category] : null;
  const Icon = visual?.icon ?? Sparkles;
  const severity = insight.severity ? severityBadge[insight.severity] : null;

  return (
    <Card
      variant="ai"
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-floating",
        !compact && "animate-pop-in",
        className
      )}
      style={!compact ? { animationDelay: `${index * 70}ms` } : undefined}
    >
      <span
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-secondary/10 blur-2xl"
        aria-hidden
      />

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
            visual?.chip ?? "bg-secondary/10 text-secondary"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold leading-tight">
              {insight.title}
            </h3>
            {severity && (
              <Badge variant={severity.variant}>{severity.label}</Badge>
            )}
          </div>
          <p
            className={cn(
              "text-sm text-muted leading-relaxed mt-1",
              compact && "line-clamp-2"
            )}
          >
            {insight.message}
          </p>
        </div>
      </div>

      {insight.impactValue && !compact && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface/70 px-2.5 py-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-medium">{insight.impactValue}</span>
        </div>
      )}

      {!compact && insight.steps && insight.steps.length > 0 && (
        <ul className="mt-3 space-y-2">
          {insight.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-foreground/90">{step}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {insight.potentialSaving ? (
            <p className="text-xs font-semibold text-success">
              Hemat {formatCurrency(insight.potentialSaving)}/bln
            </p>
          ) : (
            severity?.variant === "warning" && (
              <p className="text-xs font-medium text-warning">Perlu tindakan</p>
            )
          )}
          {!compact && insight.confidence !== undefined && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-1 w-16 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-secondary to-primary"
                  style={{ width: `${insight.confidence}%` }}
                />
              </div>
              <span className="text-[10px] text-muted">
                {insight.confidence}% yakin
              </span>
            </div>
          )}
        </div>
        <Link
          href={insight.ctaUrl}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/20"
        >
          {insight.ctaLabel}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Card>
  );
}

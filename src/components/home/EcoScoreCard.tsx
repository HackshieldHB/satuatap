import { Card } from "@/components/ui/Card";
import { Leaf, Flame } from "lucide-react";

interface EcoScoreCardProps {
  score?: number;
  streak?: number;
}

export function EcoScoreCard({ score = 82, streak = 5 }: EcoScoreCardProps) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className="text-border"
          />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            className="text-success transition-all duration-700"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none">{score}</span>
          <span className="text-[9px] text-muted">/100</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Leaf className="h-4 w-4 text-success" />
          <h3 className="text-sm font-semibold">Skor Eco</h3>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          Rumahmu lebih hemat dari 78% pengguna SATU ATAP.
        </p>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
          <Flame className="h-3 w-3" />
          {streak} hari hemat berturut
        </div>
      </div>
    </Card>
  );
}

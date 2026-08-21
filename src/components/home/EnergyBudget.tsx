"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn, formatNumber } from "@/lib/utils";
import { ENERGY_BUDGET_KWH, MOCK_MONTHLY_REPORT } from "@/data/mock";
import { Target, Minus, Plus } from "lucide-react";

export function EnergyBudget() {
  const used = MOCK_MONTHLY_REPORT.energyKwh;
  const [budget, setBudget] = useState(ENERGY_BUDGET_KWH);

  const pct = Math.min(100, Math.round((used / budget) * 100));
  const near = pct >= 85;
  const R = 32;
  const C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;

  return (
    <Card className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="7"
          />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke="currentColor"
            className={cn(
              "transition-all duration-500",
              near ? "text-error" : "text-primary"
            )}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{pct}%</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary" />
          Budget Energi
        </p>
        <p className="text-xs text-muted mt-0.5">
          {formatNumber(used, 1)} / {budget} kWh bulan ini
        </p>
        <p
          className={cn(
            "text-xs font-medium mt-1",
            near ? "text-error" : "text-success"
          )}
        >
          {near ? "⚠️ Mendekati batas budget" : "Masih aman 👍"}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-muted">Target:</span>
          <button
            onClick={() => setBudget((b) => Math.max(50, b - 10))}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-background"
            aria-label="Kurangi target"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-14 text-center text-xs font-medium">
            {budget} kWh
          </span>
          <button
            onClick={() => setBudget((b) => b + 10)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-background"
            aria-label="Tambah target"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

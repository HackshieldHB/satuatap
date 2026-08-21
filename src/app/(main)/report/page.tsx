"use client";

import { Card } from "@/components/ui/Card";
import { BarChart } from "@/components/charts/BarChart";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { MOCK_MONTHLY_REPORT, SPEND_HISTORY } from "@/data/mock";
import { Zap, Droplets, Leaf, PiggyBank, TrendingDown } from "lucide-react";

export default function ReportPage() {
  const r = MOCK_MONTHLY_REPORT;

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Laporan Bulanan</h1>
        <p className="text-sm text-muted">{r.month}</p>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-hero bg-gradient-to-br from-primary to-secondary p-5 text-primary-foreground shadow-floating animate-pop-in">
        <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        <p className="text-xs opacity-80">Total pengeluaran bulan ini</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(r.totalSpend)}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
          <TrendingDown className="h-3.5 w-3.5" />
          Hemat {formatCurrency(r.savings)} dari bulan lalu
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={<Zap className="h-4 w-4 text-warning" />}
          value={`${formatNumber(r.energyKwh, 1)}`}
          unit="kWh"
          label="Listrik"
          sub={formatCurrency(r.energyCost)}
        />
        <Stat
          icon={<Droplets className="h-4 w-4 text-info" />}
          value={`${formatNumber(r.waterLiters)}`}
          unit="L"
          label="Air"
          sub={formatCurrency(r.waterCost)}
        />
        <Stat
          icon={<Leaf className="h-4 w-4 text-success" />}
          value={`${formatNumber(r.co2Kg, 1)}`}
          unit="kg"
          label="Jejak CO₂"
          sub="setara 2 pohon"
        />
      </div>

      {/* Spend history */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Pengeluaran 5 Bulan (ribu Rp)</p>
        </div>
        <BarChart data={SPEND_HISTORY} unit="rb" />
      </Card>

      <Card className="flex items-start gap-3 bg-success/5 border-success/20">
        <Leaf className="h-5 w-5 text-success shrink-0 mt-0.5" />
        <p className="text-sm text-muted">
          Rumahmu <b className="text-foreground">18% lebih hemat</b> dari
          rata-rata unit sejenis. Aktifkan lebih banyak otomatisasi untuk hemat
          lebih banyak lagi.
        </p>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  value,
  unit,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  unit: string;
  label: string;
  sub: string;
}) {
  return (
    <Card padding="sm" className="text-center">
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-bold mt-1 leading-none">
        {value}
        <span className="text-xs font-medium text-muted"> {unit}</span>
      </p>
      <p className="text-[11px] text-muted mt-1">{label}</p>
      <p className="text-[10px] text-muted mt-0.5">{sub}</p>
    </Card>
  );
}

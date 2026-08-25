import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Zap, Droplets, Thermometer, TrendingDown, TrendingUp, ChevronRight } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { EnergyUsage, WaterUsage, EnvironmentData } from "@/types";
import { cn } from "@/lib/utils";

export function EnergyCard({ data, className }: { data: EnergyUsage; className?: string }) {
  const isDown = data.comparisonDirection === "down";

  return (
    <Card className={cn("group transition-all duration-200 hover:-translate-y-1 hover:shadow-floating", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/10 transition-transform duration-300 group-hover:scale-110">
            <Zap className="h-4 w-4 text-warning" />
          </div>
          <CardTitle className="text-sm">Listrik</CardTitle>
        </div>
      </CardHeader>
      <p className="text-2xl font-bold">{formatNumber(data.todayKwh, 2)} kWh</p>
      <p className="text-xs text-muted mt-0.5">Hari ini</p>
      <p className="text-sm text-muted mt-2">
        Estimasi: <span className="font-medium text-foreground">{formatCurrency(data.estimatedCost)}</span>
      </p>
      <div className={cn("flex items-center gap-1 text-xs mt-1", isDown ? "text-success" : "text-error")}>
        {isDown ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
        {data.comparisonPercent}% vs kemarin
      </div>
      <Link href="/energy" className="group/cta text-xs font-medium text-primary mt-3 inline-flex items-center gap-0.5">
        Lihat Energi <ChevronRight className="h-3 w-3 transition-transform group-hover/cta:translate-x-0.5" />
      </Link>
    </Card>
  );
}

export function WaterCard({ data, className }: { data: WaterUsage; className?: string }) {
  const isUp = data.comparisonDirection === "up";

  return (
    <Card className={cn("group transition-all duration-200 hover:-translate-y-1 hover:shadow-floating", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-info/10 transition-transform duration-300 group-hover:scale-110">
            <Droplets className="h-4 w-4 text-info" />
          </div>
          <CardTitle className="text-sm">Air</CardTitle>
        </div>
      </CardHeader>
      <p className="text-2xl font-bold">{formatNumber(data.todayLiters)} L</p>
      <p className="text-xs text-muted mt-0.5">Hari ini</p>
      <p className="text-sm text-muted mt-2">
        Estimasi: <span className="font-medium text-foreground">{formatCurrency(data.estimatedCost)}</span>
      </p>
      <div className={cn("flex items-center gap-1 text-xs mt-1", isUp ? "text-error" : "text-success")}>
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {data.comparisonPercent}% vs kemarin
      </div>
      <Link href="/water" className="group/cta text-xs font-medium text-primary mt-3 inline-flex items-center gap-0.5">
        Lihat Air <ChevronRight className="h-3 w-3 transition-transform group-hover/cta:translate-x-0.5" />
      </Link>
    </Card>
  );
}

export function EnvironmentCard({ data, className }: { data: EnvironmentData; className?: string }) {
  const airLabels = {
    good: "Udara baik",
    moderate: "Udara sedang",
    poor: "Udara buruk",
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary/10">
            <Thermometer className="h-4 w-4 text-secondary" />
          </div>
          <CardTitle className="text-sm">Lingkungan</CardTitle>
        </div>
      </CardHeader>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold">{formatNumber(data.temperature, 1)}°C</p>
          <p className="text-xs text-muted">Suhu</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{data.humidity}%</p>
          <p className="text-xs text-muted">Kelembapan</p>
        </div>
      </div>
      {data.airQuality && (
        <p className="text-xs text-success font-medium mt-3">{airLabels[data.airQuality]}</p>
      )}
      <Link href="/environment" className="group/cta text-xs font-medium text-primary mt-3 inline-flex items-center gap-0.5">
        Lihat Lingkungan <ChevronRight className="h-3 w-3 transition-transform group-hover/cta:translate-x-0.5" />
      </Link>
    </Card>
  );
}

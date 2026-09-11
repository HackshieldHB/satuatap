"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { WATER_BREAKDOWN } from "@/data/mock";
import { formatNumber } from "@/lib/utils";
import { Droplets } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHomeEvents } from "@/hooks/useHomeEvents";
import { telemetryService, type WaterDetail, type TankReading } from "@/services/telemetry.service";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { TankLevelCard } from "@/components/home/TankLevelCard";
import type { UsagePeriod } from "@/types";

const UsageDetailView = dynamic(
  () => import("@/components/home/UsageDetailView").then((m) => ({ default: m.UsageDetailView })),
  { loading: () => <PageLoader /> }
);

export default function WaterPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";
  const [period, setPeriod] = useState<UsagePeriod>("day");
  const [data, setData] = useState<WaterDetail | null>(null);
  const [tanks, setTanks] = useState<TankReading[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const [res, tankRes] = await Promise.all([
      telemetryService.getWater(homeId, period),
      telemetryService.getTank(homeId),
    ]);
    if (res.success && res.data) {
      setData(res.data);
      setError(false);
    } else {
      setError(true);
    }
    if (tankRes.success && tankRes.data) setTanks(tankRes.data.tanks);
  }, [homeId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  useHomeEvents(homeId, { onEvent: () => void load(), onPoll: () => void load() });

  if (!data && !error) return <PageLoader />;
  if (error || !data) return <ErrorState onRetry={load} title="Gagal memuat air" />;

  return (
    <div className="space-y-4">
      <TankLevelCard tanks={tanks} />
      <UsageDetailView
      title="Air"
      icon={Droplets}
      accentText="text-info"
      gradient="from-info/15 to-secondary/10"
      today={formatNumber(data.consumption ?? data.todayLiters)}
      unit="L"
      cost={data.estimatedCost}
      comparisonPercent={data.comparisonPercent}
      comparisonDirection={data.comparisonDirection}
      history={data.history}
      breakdown={WATER_BREAKDOWN}
      period={period}
      onPeriodChange={setPeriod}
      peak={data.peak}
      average={data.average}
      forecast="Pemakaian air dihitung dari telemetry ter-normalisasi, bukan string tampilan."
      tips={[
        "Periksa keran & flush kamar mandi dari kebocoran kecil",
        "Pasang sensor kebocoran di area cuci",
        "Manfaatkan air bekas cucian untuk menyiram tanaman",
      ]}
    />
    </div>
  );
}

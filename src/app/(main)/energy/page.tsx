"use client";

import { useCallback, useEffect, useState } from "react";
import { UsageDetailView } from "@/components/home/UsageDetailView";
import { EnergyBudget } from "@/components/home/EnergyBudget";
import { ENERGY_BREAKDOWN } from "@/data/mock";
import { formatNumber } from "@/lib/utils";
import { Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHomeEvents } from "@/hooks/useHomeEvents";
import { telemetryService, type EnergyDetail } from "@/services/telemetry.service";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import type { UsagePeriod } from "@/types";

export default function EnergyPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";
  const [period, setPeriod] = useState<UsagePeriod>("day");
  const [data, setData] = useState<EnergyDetail | null>(null);

  const load = useCallback(async () => {
    const res = await telemetryService.getEnergy(homeId, period);
    if (res.success && res.data) setData(res.data);
  }, [homeId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  useHomeEvents(homeId, { onEvent: () => void load(), onPoll: () => void load() });

  if (!data) return <PageLoader />;

  return (
    <UsageDetailView
      extra={<EnergyBudget />}
      title="Energi"
      icon={Zap}
      accentText="text-warning"
      gradient="from-warning/15 to-primary/10"
      today={formatNumber(data.consumption ?? data.todayKwh, 2)}
      unit="kWh"
      cost={data.estimatedCost}
      comparisonPercent={data.comparisonPercent}
      comparisonDirection={data.comparisonDirection}
      history={data.history}
      breakdown={ENERGY_BREAKDOWN}
      period={period}
      onPeriodChange={setPeriod}
      peak={data.peak}
      average={data.average}
      forecast="Dengan tren ini, tagihan listrik dihitung dari tarif rumah (bukan angka hardcoded)."
      tips={[
        "Jadwalkan AC mati otomatis di atas pukul 23.00",
        "Ganti lampu lama ke LED pintar untuk hemat hingga 40%",
        "Aktifkan mode hemat pada Smart Plug TV",
      ]}
    />
  );
}

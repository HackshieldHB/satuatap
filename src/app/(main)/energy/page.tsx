"use client";

import { useEffect, useState } from "react";
import { UsageDetailView } from "@/components/home/UsageDetailView";
import { EnergyBudget } from "@/components/home/EnergyBudget";
import { ENERGY_BREAKDOWN } from "@/data/mock";
import { formatNumber } from "@/lib/utils";
import { Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { telemetryService, type EnergyDetail } from "@/services/telemetry.service";
import { PageLoader } from "@/components/ui/LoadingSpinner";

export default function EnergyPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";
  const [data, setData] = useState<EnergyDetail | null>(null);

  useEffect(() => {
    telemetryService.getEnergy(homeId).then((res) => {
      if (res.success && res.data) setData(res.data);
    });
  }, [homeId]);

  if (!data) return <PageLoader />;

  return (
    <UsageDetailView
      extra={<EnergyBudget />}
      title="Energi"
      icon={Zap}
      accentText="text-warning"
      gradient="from-warning/15 to-primary/10"
      today={formatNumber(data.todayKwh, 2)}
      unit="kWh"
      cost={data.estimatedCost}
      comparisonPercent={data.comparisonPercent}
      comparisonDirection={data.comparisonDirection}
      history={data.history}
      breakdown={ENERGY_BREAKDOWN}
      forecast="Dengan tren ini, tagihan listrik dihitung dari tarif rumah (bukan angka hardcoded)."
      tips={[
        "Jadwalkan AC mati otomatis di atas pukul 23.00",
        "Ganti lampu lama ke LED pintar untuk hemat hingga 40%",
        "Aktifkan mode hemat pada Smart Plug TV",
      ]}
    />
  );
}

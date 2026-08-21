"use client";

import { UsageDetailView } from "@/components/home/UsageDetailView";
import { EnergyBudget } from "@/components/home/EnergyBudget";
import { ENERGY_HISTORY, ENERGY_BREAKDOWN, MOCK_DASHBOARD } from "@/data/mock";
import { formatNumber } from "@/lib/utils";
import { Zap } from "lucide-react";

export default function EnergyPage() {
  const e = MOCK_DASHBOARD.energy;
  return (
    <UsageDetailView
      extra={<EnergyBudget />}
      title="Energi"
      icon={Zap}
      accentText="text-warning"
      gradient="from-warning/15 to-primary/10"
      today={formatNumber(e.todayKwh, 2)}
      unit="kWh"
      cost={e.estimatedCost}
      comparisonPercent={e.comparisonPercent}
      comparisonDirection={e.comparisonDirection}
      history={ENERGY_HISTORY}
      breakdown={ENERGY_BREAKDOWN}
      forecast="Dengan tren ini, tagihan listrik bulan ini diperkirakan sekitar Rp 312.000."
      tips={[
        "Jadwalkan AC mati otomatis di atas pukul 23.00",
        "Ganti lampu lama ke LED pintar untuk hemat hingga 40%",
        "Aktifkan mode hemat pada Smart Plug TV",
      ]}
    />
  );
}

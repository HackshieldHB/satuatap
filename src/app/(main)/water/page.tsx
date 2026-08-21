"use client";

import { UsageDetailView } from "@/components/home/UsageDetailView";
import { WATER_HISTORY, WATER_BREAKDOWN, MOCK_DASHBOARD } from "@/data/mock";
import { formatNumber } from "@/lib/utils";
import { Droplets } from "lucide-react";

export default function WaterPage() {
  const w = MOCK_DASHBOARD.water;
  return (
    <UsageDetailView
      title="Air"
      icon={Droplets}
      accentText="text-info"
      gradient="from-info/15 to-secondary/10"
      today={formatNumber(w.todayLiters)}
      unit="L"
      cost={w.estimatedCost}
      comparisonPercent={w.comparisonPercent}
      comparisonDirection={w.comparisonDirection}
      history={WATER_HISTORY}
      breakdown={WATER_BREAKDOWN}
      forecast="Pemakaian air stabil. Perkiraan tagihan bulan ini sekitar Rp 102.000."
      tips={[
        "Periksa keran & flush kamar mandi dari kebocoran kecil",
        "Pasang sensor kebocoran di area cuci",
        "Manfaatkan air bekas cucian untuk menyiram tanaman",
      ]}
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import { UsageDetailView } from "@/components/home/UsageDetailView";
import { WATER_BREAKDOWN } from "@/data/mock";
import { formatNumber } from "@/lib/utils";
import { Droplets } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { telemetryService, type WaterDetail } from "@/services/telemetry.service";
import { PageLoader } from "@/components/ui/LoadingSpinner";

export default function WaterPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";
  const [data, setData] = useState<WaterDetail | null>(null);

  useEffect(() => {
    telemetryService.getWater(homeId).then((res) => {
      if (res.success && res.data) setData(res.data);
    });
  }, [homeId]);

  if (!data) return <PageLoader />;

  return (
    <UsageDetailView
      title="Air"
      icon={Droplets}
      accentText="text-info"
      gradient="from-info/15 to-secondary/10"
      today={formatNumber(data.todayLiters)}
      unit="L"
      cost={data.estimatedCost}
      comparisonPercent={data.comparisonPercent}
      comparisonDirection={data.comparisonDirection}
      history={data.history}
      breakdown={WATER_BREAKDOWN}
      forecast="Pemakaian air dihitung dari telemetry ter-normalisasi, bukan string tampilan."
      tips={[
        "Periksa keran & flush kamar mandi dari kebocoran kecil",
        "Pasang sensor kebocoran di area cuci",
        "Manfaatkan air bekas cucian untuk menyiram tanaman",
      ]}
    />
  );
}

import { SERVICE_CATEGORIES } from "@/data/mock";
import { ServiceGrid } from "@/components/services/ServiceGrid";
import { AdSlot } from "@/components/ads/AdSlot";
import { MOCK_ADS } from "@/data/mock";

export default function ServicesPage() {
  const serviceAds = MOCK_ADS.filter((a) => a.variant === "service_promotion" || a.variant === "product_promotion");

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Layanan</h1>
        <p className="text-sm text-muted">
          Bayar tagihan, belanja perangkat, dan layanan rumah dalam satu tempat.
        </p>
      </div>

      <ServiceGrid categories={SERVICE_CATEGORIES} />

      {serviceAds.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Penawaran Spesial</h2>
          <AdSlot ads={serviceAds} />
        </section>
      )}
    </div>
  );
}

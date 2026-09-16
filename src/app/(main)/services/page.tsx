import { SERVICE_CATEGORIES } from "@/data/mock";
import { ServiceGrid } from "@/components/services/ServiceGrid";
import { AdSlot } from "@/components/ads/AdSlot";
import { MOCK_ADS } from "@/data/mock";

export default function ServicesPage() {
  const serviceAds = MOCK_ADS.filter((a) => a.variant === "service_promotion" || a.variant === "product_promotion");

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="relative overflow-hidden rounded-hero p-6 text-white shadow-card lg:p-8">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/07-living-room.png')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(110deg, rgba(58,46,34,0.86) 0%, rgba(72,58,44,0.5) 55%, rgba(96,80,60,0.24) 100%)",
          }}
          aria-hidden
        />
        <div className="relative max-w-md">
          <h1 className="text-2xl font-bold">Layanan Hunian</h1>
          <p className="mt-1.5 text-sm text-white/85">
            Bayar tagihan, belanja perangkat, dan layanan rumah dalam satu tempat.
          </p>
        </div>
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

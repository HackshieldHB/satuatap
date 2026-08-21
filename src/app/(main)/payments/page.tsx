"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { paymentService } from "@/services/payment.service";
import { adService } from "@/services/ad.service";
import { BillList } from "@/components/payments/PaymentCard";
import { BillerSheet } from "@/components/payments/BillerSheet";
import { AdSlot } from "@/components/ads/AdSlot";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn, formatNumber } from "@/lib/utils";
import { MOCK_ELECTRICITY_TOKEN, BILLERS } from "@/data/mock";
import {
  Zap,
  Smartphone,
  Wifi,
  Droplets,
  HeartPulse,
  Router,
  Building2,
  Gauge,
  type LucideIcon,
} from "lucide-react";
import type { Bill, Advertisement, Biller } from "@/types";

const billerIcons: Record<string, LucideIcon> = {
  zap: Zap,
  smartphone: Smartphone,
  wifi: Wifi,
  droplets: Droplets,
  "heart-pulse": HeartPulse,
  router: Router,
  building: Building2,
};

export default function PaymentsPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";

  const [bills, setBills] = useState<Bill[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [token, setToken] = useState(MOCK_ELECTRICITY_TOKEN);
  const [activeBiller, setActiveBiller] = useState<Biller | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [billResult, adResult] = await Promise.all([
      paymentService.getBills(homeId),
      adService.getAdsByPlacement("HOME_PAYMENT"),
    ]);
    if (billResult.success && billResult.data) setBills(billResult.data);
    else setError(true);
    if (adResult.success && adResult.data) setAds(adResult.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId]);

  const handleBillPaid = (id: string) =>
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "paid" } : b))
    );

  const handleTopupSuccess = (biller: Biller, amount: number) => {
    if (biller.id === "token-listrik") {
      const kwh = Math.round((amount / 1526) * 10) / 10;
      setToken((t) => ({
        ...t,
        remainingKwh: Math.round((t.remainingKwh + kwh) * 10) / 10,
        lastTopUp: new Date().toISOString().slice(0, 10),
      }));
    }
  };

  const tokenBiller = BILLERS.find((b) => b.id === "token-listrik") ?? null;
  const low = token.remainingKwh <= token.lowThreshold;

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Pembayaran</h1>
        <p className="text-sm text-muted">
          Token, pulsa, tagihan — bayar pakai QRIS, VA, transfer, atau kartu.
        </p>
      </div>

      {/* Electricity token status */}
      <div
        className={cn(
          "relative overflow-hidden rounded-hero p-5 text-primary-foreground shadow-floating animate-pop-in bg-gradient-to-br",
          low ? "from-error to-warning" : "from-primary to-primary-hover"
        )}
      >
        <span
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
              <Gauge className="h-3.5 w-3.5" />
              Token Listrik · {token.meterNumber}
            </div>
            <p className="mt-1 text-3xl font-bold">
              {formatNumber(token.remainingKwh, 1)}
              <span className="ml-1 text-base font-medium">kWh</span>
            </p>
            <p className="text-xs text-primary-foreground/80 mt-0.5">
              {low ? "⚠️ Segera habis — isi sekarang" : "Token tersisa"}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Zap className="h-6 w-6" />
          </div>
        </div>
        <Button
          variant="secondary"
          className="mt-4 w-full bg-white/20 text-primary-foreground hover:bg-white/30"
          onClick={() => setActiveBiller(tokenBiller)}
        >
          Isi Token Listrik
        </Button>
      </div>

      {/* Top-up / billers */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Isi Ulang & Bayar</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {BILLERS.map((b) => {
            const Icon = billerIcons[b.icon] || Zap;
            return (
              <button
                key={b.id}
                onClick={() => setActiveBiller(b)}
                className="group flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-surface p-3 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-floating active:scale-95"
              >
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                    b.color
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium text-center leading-tight">
                  {b.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <AdSlot ads={ads} />

      {/* Bills */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Tagihan Belum Dibayar</h2>
        {loading && (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}
        {error && !loading && (
          <ErrorState onRetry={loadData} message="Tidak dapat memuat tagihan." />
        )}
        {!loading && !error && (
          <BillList
            bills={bills.filter((b) => b.status !== "paid")}
            onPaid={handleBillPaid}
          />
        )}
      </section>

      <BillerSheet
        biller={activeBiller}
        onClose={() => setActiveBiller(null)}
        onSuccess={handleTopupSuccess}
      />
    </div>
  );
}

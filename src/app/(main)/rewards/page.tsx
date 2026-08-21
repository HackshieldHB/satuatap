"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRewards } from "@/hooks/useRewards";
import { useToast } from "@/hooks/useToast";
import { resolveIcon } from "@/lib/icons";
import { VOUCHERS, REFERRAL_CODE } from "@/data/mock";
import { Gift, Users, Star, Copy } from "lucide-react";

export default function RewardsPage() {
  const { points, spendPoints } = useRewards();
  const { showToast } = useToast();

  const redeem = (cost: number, title: string) => {
    if (spendPoints(cost)) {
      showToast(`${title} ditukar! Cek di dompet voucher.`, "success");
    } else {
      showToast("Poin belum cukup.", "error");
    }
  };

  const copyReferral = () => {
    navigator.clipboard?.writeText(REFERRAL_CODE).catch(() => {});
    showToast("Kode referral disalin.", "success");
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-xl font-bold">Poin & Reward</h1>

      {/* Points hero */}
      <div className="relative overflow-hidden rounded-hero bg-gradient-to-br from-accent to-warning p-5 text-accent-foreground shadow-floating animate-pop-in">
        <span className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs font-medium opacity-80">Poin SATU ATAP</p>
            <p className="text-4xl font-bold mt-1">{points.toLocaleString("id-ID")}</p>
            <p className="text-xs opacity-80 mt-1">
              Dapat poin tiap transaksi & tukar jadi diskon.
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25">
            <Star className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Vouchers */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Tukar Poin</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VOUCHERS.map((v) => {
            const Icon = resolveIcon(v.icon, Gift);
            const affordable = points >= v.cost;
            return (
              <Card key={v.id} className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{v.title}</p>
                  <p className="text-xs text-muted">{v.description}</p>
                  <p className="text-xs font-bold text-accent-foreground mt-0.5">
                    {v.cost.toLocaleString("id-ID")} poin
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={affordable ? "primary" : "outline"}
                  className="shrink-0"
                  onClick={() => redeem(v.cost, v.title)}
                  disabled={!affordable}
                >
                  Tukar
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Referral */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Ajak Tetangga</p>
            <p className="text-xs text-muted">
              Kamu & temanmu masing-masing dapat 500 poin.
            </p>
          </div>
        </div>
        <button
          onClick={copyReferral}
          className="flex w-full items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3"
        >
          <span className="font-mono text-sm font-bold tracking-wide">
            {REFERRAL_CODE}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <Copy className="h-3.5 w-3.5" />
            Salin
          </span>
        </button>
      </Card>
    </div>
  );
}

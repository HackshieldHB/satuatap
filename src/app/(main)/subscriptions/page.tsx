"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/hooks/useToast";
import { resolveIcon } from "@/lib/icons";
import { formatCurrency, cn } from "@/lib/utils";
import { SUBSCRIPTION_PLANS } from "@/data/mock";
import { RefreshCw } from "lucide-react";
import type { SubscriptionPlan } from "@/types";

export default function SubscriptionsPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() =>
    SUBSCRIPTION_PLANS.map((p) => ({ ...p }))
  );

  const toggle = (id: string) =>
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const active = !p.active;
        showToast(
          active ? `Langganan ${p.title} aktif ✅` : `Langganan ${p.title} dijeda`,
          active ? "success" : "info"
        );
        return { ...p, active };
      })
    );

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Langganan</h1>
        <p className="text-sm text-muted">
          Otomatiskan kebutuhan rutin — bayar tetap pakai QRIS/VA/kartu.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-secondary/20 bg-secondary/5 p-3 text-sm">
        <RefreshCw className="h-4 w-4 text-secondary shrink-0" />
        <span className="text-muted">
          Setiap penagihan otomatis mengirim notifikasi & bisa dibatalkan kapan
          saja.
        </span>
      </div>

      <div className="space-y-3">
        {plans.map((p) => {
          const Icon = resolveIcon(p.icon);
          return (
            <Card key={p.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  p.active
                    ? "bg-primary/10 text-primary"
                    : "bg-background text-muted"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted">{p.description}</p>
                <p className="text-sm font-bold mt-1">
                  {formatCurrency(p.price)}
                  <span className="text-xs font-normal text-muted">
                    {" "}
                    / {p.cadence}
                  </span>
                </p>
              </div>
              <Toggle
                checked={p.active}
                onChange={() => toggle(p.id)}
                label={p.title}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { billingService, type Invoice } from "@/services/billing.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, cn } from "@/lib/utils";
import { Receipt, Zap, Droplets, Building } from "lucide-react";

const LINE_ICON = { electricity: Zap, water: Droplets, ipl: Building, other: Receipt } as const;

export default function InvoicesPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!homeId) return;
    const res = await billingService.getInvoices(homeId);
    if (res.success && res.data) setInvoices(res.data);
  }, [homeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function pay(inv: Invoice) {
    if (!homeId) return;
    setBusy(inv.id);
    try {
      const res = await billingService.payInvoice(homeId, inv.id);
      if (res.success && res.data) {
        setInvoices((prev) => prev.map((i) => (i.id === inv.id ? res.data! : i)));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Tagihan</h1>
        <p className="text-sm text-muted">Tagihan bulanan listrik, air &amp; IPL unit kamu.</p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Belum ada tagihan"
          description="Tagihan bulanan akan muncul di sini setelah dibuat pengelola."
        />
      ) : (
        invoices.map((inv) => {
          const paid = inv.status === "paid";
          return (
            <Card key={inv.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{inv.periodLabel}</p>
                  <p className="text-xs text-muted">
                    Jatuh tempo {new Date(inv.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    paid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  )}
                >
                  {paid ? "Lunas" : "Belum bayar"}
                </span>
              </div>

              <ul className="mt-3 space-y-1.5">
                {inv.lines.map((l) => {
                  const Icon = LINE_ICON[l.kind] ?? Receipt;
                  return (
                    <li key={l.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted">
                        <Icon className="h-4 w-4" />
                        {l.description}
                        {l.quantity > 0 && l.unit ? (
                          <span className="text-xs">
                            ({l.quantity} {l.unit})
                          </span>
                        ) : null}
                      </span>
                      <span>{formatCurrency(l.amountIdr)}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold">{formatCurrency(inv.totalIdr)}</span>
              </div>

              {!paid && (
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  disabled={busy === inv.id}
                  onClick={() => pay(inv)}
                >
                  Bayar (QRIS simulasi)
                </Button>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

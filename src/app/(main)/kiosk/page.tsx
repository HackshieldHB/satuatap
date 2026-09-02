"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { commerceService } from "@/services/commerce.service";
import type { Order, OrderStatus } from "@/types";
import { Store, PackageCheck, RefreshCw } from "lucide-react";

const STATUS_META: Record<
  OrderStatus,
  { label: string; badge: string; action?: { next: OrderStatus; label: string } }
> = {
  confirmed: {
    label: "Pesanan baru",
    badge: "bg-primary/10 text-primary",
    action: { next: "preparing", label: "Mulai siapkan" },
  },
  preparing: {
    label: "Disiapkan",
    badge: "bg-warning/10 text-warning",
    action: { next: "delivering", label: "Antar ke unit" },
  },
  delivering: {
    label: "Diantar",
    badge: "bg-secondary/10 text-secondary",
    action: { next: "completed", label: "Selesai" },
  },
  completed: { label: "Selesai", badge: "bg-success/10 text-success" },
  cancelled: { label: "Dibatalkan", badge: "bg-error/10 text-error" },
};

export default function KioskPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string>("Kios");
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Which kiosk this screen operates = the kiosk of the selected building.
  useEffect(() => {
    if (!homeId) return;
    void commerceService.getMarketplace(homeId).then((res) => {
      if (res.success && res.data && res.data.vendors[0]) {
        setVendorId(res.data.vendors[0].id);
        setVendorName(res.data.vendors[0].name);
      }
    });
  }, [homeId]);

  const load = useCallback(async () => {
    if (!vendorId) return;
    const res = await commerceService.getVendorOrders(vendorId);
    if (res.success && res.data) setOrders(res.data);
  }, [vendorId]);

  // Poll so orders placed by residents appear on the kiosk screen live.
  useEffect(() => {
    if (!vendorId) return;
    void load();
    timer.current = setInterval(() => void load(), 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [vendorId, load]);

  const advance = async (o: Order) => {
    const action = STATUS_META[o.status].action;
    if (!action) return;
    setBusy(o.id);
    const res = await commerceService.advanceOrder(o.id, action.next);
    if (res.success && res.data) {
      setOrders((prev) => prev.map((x) => (x.id === o.id ? res.data! : x)));
    }
    setBusy(null);
  };

  const active = orders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled"
  );
  const done = orders.filter((o) => o.status === "completed");

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-secondary" /> Layar Kios
          </h1>
          <p className="text-sm text-muted">{vendorName} · pesanan masuk otomatis</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success" />
        Memantau pesanan tiap 4 detik · {active.length} aktif
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Belum ada pesanan aktif"
          description="Pesanan dari penghuni akan muncul di sini secara otomatis."
        />
      ) : (
        <div className="space-y-3">
          {active.map((o) => {
            const meta = STATUS_META[o.status];
            return (
              <Card key={o.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {o.unit ?? "Unit"}{o.floor ? ` · ${o.floor}` : ""}
                    </p>
                    <p className="text-[11px] text-muted">
                      {new Date(o.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {o.paymentChannel === "cash" ? "Tunai (COD)" : "QRIS/transfer"}
                      {" · "}
                      <span
                        className={
                          o.paymentStatus === "paid" ? "text-success" : "text-warning"
                        }
                      >
                        {o.paymentStatus === "paid" ? "Lunas" : "Belum bayar"}
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      meta.badge
                    )}
                  >
                    {meta.label}
                  </span>
                </div>

                <div className="space-y-1 border-t border-border pt-2">
                  {o.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between text-xs text-muted"
                    >
                      <span className="truncate pr-2">
                        {it.emoji ? `${it.emoji} ` : ""}
                        {it.name}
                        {it.qty > 1 ? ` ×${it.qty}` : ""}
                      </span>
                      <span className="shrink-0">
                        {formatCurrency(it.price * it.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-sm font-bold">{formatCurrency(o.total)}</span>
                  {meta.action && (
                    <Button
                      size="sm"
                      isLoading={busy === o.id}
                      onClick={() => void advance(o)}
                    >
                      {meta.action.label}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted">Selesai hari ini</p>
          {done.slice(0, 8).map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs text-muted"
            >
              <span>
                {o.unit ?? "Unit"} · {o.items.length} item
              </span>
              <span className="font-medium text-success">
                {formatCurrency(o.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

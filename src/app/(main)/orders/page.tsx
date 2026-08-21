"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useOrders, ORDER_FLOW } from "@/hooks/useOrders";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, cn } from "@/lib/utils";
import { Package, Check, ChefHat, Bike, PartyPopper } from "lucide-react";
import type { Order, OrderStatus } from "@/types";

const STEP_META: Record<OrderStatus, { label: string; icon: typeof Check }> = {
  confirmed: { label: "Dikonfirmasi", icon: Check },
  preparing: { label: "Disiapkan", icon: ChefHat },
  delivering: { label: "Diantar", icon: Bike },
  completed: { label: "Selesai", icon: PartyPopper },
};

export default function OrdersPage() {
  const { orders, advance } = useOrders();
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  // Live tracking: nudge active orders forward every few seconds.
  useEffect(() => {
    const t = setInterval(() => {
      ordersRef.current
        .filter((o) => o.status !== "completed")
        .forEach((o) => advance(o.id));
    }, 6000);
    return () => clearInterval(t);
  }, [advance]);

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Pesanan</h1>
        <p className="text-sm text-muted">Lacak status pesanan warung & marketplace.</p>
      </div>

      {orders.length === 0 ? (
        <div>
          <EmptyState
            icon={Package}
            title="Belum ada pesanan"
            description="Pesananmu dari Warung & Marketplace akan muncul di sini."
          />
          <div className="flex justify-center gap-2">
            <Link href="/store">
              <Button variant="outline" size="sm">
                Warung Rumah
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="sm">
                Marketplace
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const currentIdx = ORDER_FLOW.indexOf(order.status);

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{order.title}</p>
          <p className="text-xs text-muted">
            #{order.id.replace("ord-", "")} ·{" "}
            {order.kind === "service" ? "Warung" : "Marketplace"}
          </p>
          {order.vendor && (
            <p className="text-xs text-muted mt-0.5">{order.vendor}</p>
          )}
        </div>
        <p className="text-sm font-bold shrink-0">{formatCurrency(order.total)}</p>
      </div>

      {/* Timeline */}
      <div className="flex items-center">
        {ORDER_FLOW.map((step, i) => {
          const meta = STEP_META[step];
          const Icon = meta.icon;
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    done
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted",
                    active && "ring-2 ring-primary/30 animate-pulse"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    "text-[9px] text-center leading-tight",
                    done ? "text-foreground font-medium" : "text-muted"
                  )}
                >
                  {meta.label}
                </span>
              </div>
              {i < ORDER_FLOW.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 -mt-4 transition-colors",
                    i < currentIdx ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {order.status !== "completed" && order.eta && (
        <p className="text-xs text-center text-secondary font-medium">
          {order.status === "delivering"
            ? `🛵 Dalam perjalanan · ${order.eta}`
            : `Estimasi ${order.eta}`}
        </p>
      )}
      {order.status === "completed" && (
        <p className="text-xs text-center text-success font-medium">
          ✓ Pesanan selesai
        </p>
      )}
    </Card>
  );
}

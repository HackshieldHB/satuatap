"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Order, OrderStatus } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { commerceService } from "@/services/commerce.service";

export const ORDER_FLOW: OrderStatus[] = [
  "confirmed",
  "preparing",
  "delivering",
  "completed",
];

interface OrdersContextValue {
  orders: Order[];
  activeCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  advance: (id: string) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!homeId) return;
    setLoading(true);
    const res = await commerceService.getOrders(homeId);
    if (res.success && res.data) setOrders(res.data);
    setLoading(false);
  }, [homeId]);

  // Load the current unit's orders, and reload when the selected building changes.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const advance = useCallback(
    async (id: string) => {
      const current = orders.find((o) => o.id === id);
      if (!current) return;
      const i = ORDER_FLOW.indexOf(current.status);
      if (i < 0 || i >= ORDER_FLOW.length - 1) return;
      const res = await commerceService.advanceOrder(id, ORDER_FLOW[i + 1]);
      if (res.success && res.data) {
        setOrders((prev) => prev.map((o) => (o.id === id ? res.data! : o)));
      }
    },
    [orders]
  );

  const activeCount = orders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled"
  ).length;

  return (
    <OrdersContext.Provider value={{ orders, activeCount, loading, refresh, advance }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}

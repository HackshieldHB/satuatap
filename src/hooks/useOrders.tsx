"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Order, OrderStatus } from "@/types";
import { MOCK_ORDERS } from "@/data/mock";

export const ORDER_FLOW: OrderStatus[] = [
  "confirmed",
  "preparing",
  "delivering",
  "completed",
];

interface OrdersContextValue {
  orders: Order[];
  activeCount: number;
  addOrder: (
    o: Omit<Order, "id" | "status" | "createdAt"> & { status?: OrderStatus }
  ) => string;
  advance: (id: string) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() =>
    MOCK_ORDERS.map((o) => ({ ...o }))
  );

  const addOrder = useCallback<OrdersContextValue["addOrder"]>((o) => {
    const id = `ord-${Date.now()}`;
    setOrders((prev) => [
      {
        ...o,
        id,
        createdAt: new Date().toISOString(),
        status: o.status ?? "confirmed",
      },
      ...prev,
    ]);
    return id;
  }, []);

  const advance = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const i = ORDER_FLOW.indexOf(o.status);
        return i < ORDER_FLOW.length - 1
          ? { ...o, status: ORDER_FLOW[i + 1] }
          : o;
      })
    );
  }, []);

  const activeCount = orders.filter((o) => o.status !== "completed").length;

  return (
    <OrdersContext.Provider value={{ orders, activeCount, addOrder, advance }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}

import { apiFetch } from "@/services/http";
import type { Order, OrderStatus, Product } from "@/types";

export interface MarketplaceVendor {
  id: string;
  name: string;
  floorLabel: string;
  emoji: string;
}

export interface Marketplace {
  vendors: MarketplaceVendor[];
  products: Product[];
  categories: { id: string; label: string }[];
}

export interface CreateOrderInput {
  vendorId: string;
  items: { productId: string; qty: number }[];
  paymentChannel: string;
  note?: string;
}

/**
 * In-building kiosk commerce. Products and orders are scoped by the resident's
 * unit (homeId → building) on the server; the kiosk views orders by vendorId.
 */
export const commerceService = {
  getMarketplace(homeId: string) {
    return apiFetch<Marketplace>(`/v1/homes/${homeId}/marketplace`);
  },
  getOrders(homeId: string) {
    return apiFetch<Order[]>(`/v1/homes/${homeId}/orders`);
  },
  createOrder(homeId: string, body: CreateOrderInput) {
    return apiFetch<Order>(`/v1/homes/${homeId}/orders`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  getVendorOrders(vendorId: string, activeOnly = false) {
    return apiFetch<Order[]>(
      `/v1/vendors/${vendorId}/orders${activeOnly ? "?active=1" : ""}`
    );
  },
  advanceOrder(orderId: string, status: OrderStatus) {
    return apiFetch<Order>(`/v1/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};

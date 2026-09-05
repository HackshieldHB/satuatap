import { apiFetch } from "@/services/http";

export interface InvoiceLine {
  id: string;
  kind: "electricity" | "water" | "ipl" | "other";
  description: string;
  quantity: number;
  unit: string;
  amountIdr: number;
}

export interface Invoice {
  id: string;
  homeId: string;
  periodStart: string;
  periodLabel: string;
  status: "unpaid" | "paid" | "overdue" | "void";
  totalIdr: number;
  dueDate: string;
  paidAt: string | null;
  paymentChannel: string | null;
  createdAt: string;
  lines: InvoiceLine[];
}

export interface BuildingUnit {
  homeId: string;
  name: string;
  floorLabel: string;
  prepaid: boolean;
  prepaidBalanceIdr: number | null;
  disconnected: boolean;
  arrearsIdr: number;
  unpaidCount: number;
  invoices: Invoice[];
}

/**
 * Postpaid billing. Residents list and pay their invoices; the building manager
 * (ADMIN on any unit) sees every unit's arrears and generates invoices.
 */
export const billingService = {
  getInvoices(homeId: string) {
    return apiFetch<Invoice[]>(`/v1/homes/${homeId}/invoices`);
  },
  payInvoice(homeId: string, invoiceId: string, paymentChannel = "qris") {
    return apiFetch<Invoice>(`/v1/homes/${homeId}/invoices/${invoiceId}/pay`, {
      method: "POST",
      body: JSON.stringify({ paymentChannel }),
    });
  },
  getBuildingUnits(buildingId: string) {
    return apiFetch<BuildingUnit[]>(`/v1/buildings/${buildingId}/units`);
  },
  generateBuildingInvoices(buildingId: string, period?: string) {
    return apiFetch<Invoice[]>(`/v1/buildings/${buildingId}/invoices/generate`, {
      method: "POST",
      body: JSON.stringify(period ? { period } : {}),
    });
  },
};

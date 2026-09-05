import { apiFetch } from "@/services/http";

export interface PrepaidTransaction {
  id: string;
  kind: "topup" | "usage" | "adjustment";
  amountIdr: number;
  balanceAfterIdr: number;
  description: string;
  createdAt: string;
}

export interface PrepaidStatus {
  homeId: string;
  enabled: boolean;
  balanceIdr: number;
  lowBalanceThresholdIdr: number;
  disconnected: boolean;
  electricityRelayDeviceId: string | null;
  waterValveDeviceId: string | null;
  transactions: PrepaidTransaction[];
}

export interface PrepaidConfigInput {
  enabled?: boolean;
  lowBalanceThresholdIdr?: number;
  electricityRelayDeviceId?: string | null;
  waterValveDeviceId?: string | null;
}

/**
 * Opt-in prepaid utility wallet. A unit debits its balance for metered
 * electricity/water; hitting zero auto-cuts the configured relay/valve, and a
 * top-up reconnects. `data` is null when the unit has no prepaid account.
 */
export const prepaidService = {
  getStatus(homeId: string) {
    return apiFetch<PrepaidStatus | null>(`/v1/homes/${homeId}/prepaid`);
  },
  setConfig(homeId: string, body: PrepaidConfigInput) {
    return apiFetch<PrepaidStatus>(`/v1/homes/${homeId}/prepaid/config`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  topup(homeId: string, amountIdr: number, paymentChannel = "qris") {
    return apiFetch<PrepaidStatus>(`/v1/homes/${homeId}/prepaid/topup`, {
      method: "POST",
      body: JSON.stringify({ amountIdr, paymentChannel }),
    });
  },
};

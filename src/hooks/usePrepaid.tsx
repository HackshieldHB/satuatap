"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  prepaidService,
  type PrepaidStatus,
  type PrepaidConfigInput,
} from "@/services/prepaid.service";

/**
 * The signed-in unit's prepaid wallet. Loads on mount and when the selected
 * building changes; exposes top-up and config actions that refresh in place.
 */
export function usePrepaid() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [status, setStatus] = useState<PrepaidStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!homeId) return;
    setLoading(true);
    const res = await prepaidService.getStatus(homeId);
    if (res.success) setStatus(res.data ?? null);
    setLoading(false);
  }, [homeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const topup = useCallback(
    async (amountIdr: number, paymentChannel = "qris") => {
      if (!homeId) return;
      const res = await prepaidService.topup(homeId, amountIdr, paymentChannel);
      if (res.success && res.data) setStatus(res.data);
    },
    [homeId]
  );

  const setConfig = useCallback(
    async (body: PrepaidConfigInput) => {
      if (!homeId) return;
      const res = await prepaidService.setConfig(homeId, body);
      if (res.success && res.data) setStatus(res.data);
    },
    [homeId]
  );

  return { status, loading, refresh, topup, setConfig };
}

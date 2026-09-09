"use client";

import { useEffect, useState } from "react";
import type { Home } from "@/types";
import { homeService } from "@/services/home.service";
import { MOCK_HOMES } from "@/data/mock";
import { useMockData } from "@/lib/config";

/**
 * Homes the signed-in user can switch to. In API mode we never fall back to
 * mock IDs — picking a sample home the user is not a member of 403s the dashboard.
 */
export function useHomes(): Home[] {
  const [homes, setHomes] = useState<Home[]>(useMockData ? MOCK_HOMES : []);

  useEffect(() => {
    let alive = true;
    void homeService.getHomes().then((res) => {
      if (alive && res.success && res.data && res.data.length > 0) {
        setHomes(res.data);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return homes;
}

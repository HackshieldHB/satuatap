"use client";

import { useEffect, useState } from "react";
import type { Home } from "@/types";
import { homeService } from "@/services/home.service";
import { MOCK_HOMES } from "@/data/mock";

/**
 * The buildings/units the signed-in user can manage. Loads from the API and
 * falls back to the local sample so the switcher always has something to show.
 */
export function useHomes(): Home[] {
  const [homes, setHomes] = useState<Home[]>(MOCK_HOMES);

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

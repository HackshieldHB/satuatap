"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { INITIAL_POINTS } from "@/data/mock";

interface RewardsContextValue {
  points: number;
  addPoints: (n: number) => void;
  spendPoints: (n: number) => boolean;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

export function RewardsProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState(INITIAL_POINTS);

  const addPoints = useCallback((n: number) => {
    if (n > 0) setPoints((p) => p + n);
  }, []);

  const spendPoints = useCallback(
    (n: number) => {
      if (points < n) return false;
      setPoints((p) => p - n);
      return true;
    },
    [points]
  );

  return (
    <RewardsContext.Provider value={{ points, addPoints, spendPoints }}>
      {children}
    </RewardsContext.Provider>
  );
}

export function useRewards() {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error("useRewards must be used within RewardsProvider");
  return ctx;
}

import { apiFetch } from "@/services/http";

export interface Insight {
  id: string;
  kind: "forecast" | "trend" | "leak" | "standby" | "benchmark";
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  valueIdr?: number;
}

export interface LeaderboardRow {
  homeId: string;
  name: string;
  kwh: number;
  rank: number;
  ecoScore: number;
}

/** Predictive/anomaly insights for a unit + its building efficiency leaderboard. */
export const insightsService = {
  getInsights(homeId: string) {
    return apiFetch<Insight[]>(`/v1/homes/${homeId}/insights`);
  },
  getLeaderboard(homeId: string) {
    return apiFetch<LeaderboardRow[]>(`/v1/homes/${homeId}/leaderboard`);
  },
};

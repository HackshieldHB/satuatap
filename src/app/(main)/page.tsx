"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { homeService } from "@/services/home.service";
import { adService } from "@/services/ad.service";
import { useAuth } from "@/hooks/useAuth";
import { useHomeEvents } from "@/hooks/useHomeEvents";
import { useHomes } from "@/hooks/useHomes";
import { getGreeting } from "@/lib/utils";
import { QUICK_ACTIONS } from "@/data/mock";
import { DashboardHero, DashboardStats } from "@/components/home/HomeStatusCard";
import { QuickActions } from "@/components/home/QuickActions";
import { ScenesSection } from "@/components/home/ScenesSection";
import { EcoScoreCard } from "@/components/home/EcoScoreCard";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import { EnergyCard, WaterCard, EnvironmentCard } from "@/components/home/UsageCards";
import { DeviceSummary } from "@/components/devices/DeviceCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card } from "@/components/ui/Card";
import type { DashboardData, Advertisement } from "@/types";

export default function DashboardPage() {
  const { user, session } = useAuth();
  const homes = useHomes();
  const homeId = session?.selectedHomeId || "home-1";
  const homeName =
    homes.find((h) => h.id === homeId)?.name || user?.fullName?.split(" ")[0] || "Rumah";

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [heroAds, setHeroAds] = useState<Advertisement[]>([]);
  const [middleAds, setMiddleAds] = useState<Advertisement[]>([]);
  const [recAds, setRecAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadGen = useRef(0);

  const loadData = useCallback(async (silent = false) => {
    const gen = ++loadGen.current;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    try {
      const dashResult = await homeService.getDashboard(homeId);
      if (gen !== loadGen.current) return;
      if (dashResult.success && dashResult.data) {
        setDashboard(dashResult.data);
        setError(false);
      } else if (!silent) {
        setError(true);
      }
    } catch {
      if (gen === loadGen.current && !silent) setError(true);
    }
    if (gen === loadGen.current && !silent) setLoading(false);

    if (silent) return;

    void Promise.all([
      adService.getAdsByPlacement("HOME_HERO"),
      adService.getAdsByPlacement("HOME_MIDDLE"),
      adService.getAdsByPlacement("HOME_RECOMMENDATION"),
    ]).then(([heroResult, midResult, recResult]) => {
      if (gen !== loadGen.current) return;
      if (heroResult.success && heroResult.data) setHeroAds(heroResult.data);
      if (midResult.success && midResult.data) setMiddleAds(midResult.data);
      if (recResult.success && recResult.data) setRecAds(recResult.data);
    });
  }, [homeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useHomeEvents(homeId, {
    onEvent: () => void loadData(true),
    onPoll: () => void loadData(true),
  });

  if (loading) return <DashboardSkeleton />;
  if (error || !dashboard)
    return <ErrorState onRetry={loadData} title="Gagal memuat dashboard" />;

  const statusType =
    dashboard.homeStatus === "normal"
      ? "normal"
      : dashboard.homeStatus === "devices_offline"
        ? "error"
        : "warning";

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <DashboardHero
        greeting={getGreeting(user?.fullName?.split(" ")[0] || "User")}
        homeName={homeName}
        statusMessage={dashboard.statusMessage}
        statusType={statusType}
      />

      <DashboardStats
        energyKwh={dashboard.energy.todayKwh}
        waterLiters={dashboard.water.todayLiters}
        devicesOnline={dashboard.devicesOnline}
        devicesOffline={dashboard.devicesOffline}
        temperature={dashboard.environment.temperature}
      />

      <AdSlot ads={heroAds} />

      <QuickActions actions={QUICK_ACTIONS} />

      <ScenesSection />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <EnergyCard data={dashboard.energy} />
            <WaterCard data={dashboard.water} />
          </div>
          <EnvironmentCard data={dashboard.environment} />
          <DeviceSummary
            devicesOnline={dashboard.devicesOnline}
            devicesOffline={dashboard.devicesOffline}
            featuredDevices={dashboard.featuredDevices}
          />
        </div>

        <div className="space-y-4">
          <EcoScoreCard />
          <AIInsightCard insight={dashboard.aiInsight} compact />
          <AdSlot ads={middleAds} />
        </div>
      </div>

      {dashboard.recentActivity.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Aktivitas Terbaru</h2>
          <div className="space-y-2">
            {dashboard.recentActivity.map((activity) => (
              <Card key={activity.id} padding="md" className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted">
                    {new Date(activity.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Rekomendasi untukmu</h2>
        <AdSlot ads={recAds} />
      </section>
    </div>
  );
}

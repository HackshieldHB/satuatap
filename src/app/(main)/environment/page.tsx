"use client";

import { useCallback, useEffect, useState } from "react";
import { Thermometer, Droplets, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHomeEvents } from "@/hooks/useHomeEvents";
import { telemetryService } from "@/services/telemetry.service";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/Tabs";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { Area } from "@/components/charts";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { EnvironmentDetail, UsagePeriod } from "@/types";

const PERIODS: { id: UsagePeriod; label: string }[] = [
  { id: "day", label: "Hari" },
  { id: "week", label: "Minggu" },
  { id: "month", label: "Bulan" },
];

export default function EnvironmentPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";
  const [period, setPeriod] = useState<UsagePeriod>("day");
  const [data, setData] = useState<EnvironmentDetail | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const res = await telemetryService.getEnvironmentDetail(homeId, period);
    if (res.success && res.data) {
      setData(res.data);
      setError(false);
    } else {
      setError(true);
    }
  }, [homeId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  useHomeEvents(homeId, { onEvent: () => void load(), onPoll: () => void load() });

  if (!data && !error) return <PageLoader />;
  if (error || !data) return <ErrorState onRetry={load} message="Tidak dapat memuat lingkungan." />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Lingkungan</h1>
          <p className="text-sm text-muted">Suhu, kelembapan, dan gerakan per ruangan</p>
        </div>
        <SegmentedControl
          options={PERIODS}
          value={period}
          onChange={(id) => setPeriod(id as UsagePeriod)}
        />
      </div>

      {data.rooms.map((room) => (
        <Card key={room.deviceId} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{room.room}</h2>
            <p className="text-xs text-muted">{room.deviceId}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background p-3">
              <div className="flex items-center gap-1.5 text-muted">
                <Thermometer className="h-3.5 w-3.5" />
                <span className="text-[11px]">Suhu</span>
              </div>
              <p className="text-2xl font-bold mt-1">{formatNumber(room.temperature, 1)}°C</p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <div className="flex items-center gap-1.5 text-muted">
                <Droplets className="h-3.5 w-3.5" />
                <span className="text-[11px]">Kelembapan</span>
              </div>
              <p className="text-2xl font-bold mt-1">{formatNumber(room.humidity, 0)}%</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Min" value={`${formatNumber(room.min, 1)}°`} />
            <Stat label="Rata-rata" value={`${formatNumber(room.avg, 1)}°`} />
            <Stat label="Maks" value={`${formatNumber(room.max, 1)}°`} />
          </div>
          <Area data={room.history} unit="°C" height={160} />
        </Card>
      ))}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Gerakan 24 jam</h2>
        </div>
        <div className="space-y-4">
          {data.motion.map((m) => (
            <div key={m.deviceId}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">{m.room}</span>
                <span className="text-xs text-muted">
                  {m.lastDetected ? formatRelativeTime(m.lastDetected) : "Tidak terdeteksi"}
                </span>
              </div>
              <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {m.hours.map((on, h) => (
                  <div
                    key={h}
                    title={`${h}:00`}
                    className={cn("h-6 rounded-sm", on ? "bg-primary" : "bg-background")}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted mt-1">
                <span>00</span>
                <span>12</span>
                <span>23</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Cloud, Cpu, Database, Radio, Server } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHomeEvents } from "@/hooks/useHomeEvents";
import { systemService } from "@/services/system.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatRelativeTime } from "@/lib/utils";
import { isLocalMode, subscribeLocalMode } from "@/lib/local-mode";
import type { SystemComponentStatus, SystemHealth } from "@/types";

const STATUS_VARIANT: Record<SystemComponentStatus, "success" | "warning" | "error" | "default"> = {
  up: "success",
  degraded: "warning",
  down: "error",
  unknown: "default",
};

const STATUS_LABEL: Record<SystemComponentStatus, string> = {
  up: "Normal",
  degraded: "Terdegradasi",
  down: "Down",
  unknown: "Tidak diketahui",
};

export default function SystemPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";
  const [data, setData] = useState<SystemHealth | null>(null);
  const [error, setError] = useState(false);
  const [local, setLocal] = useState(false);

  const load = useCallback(async () => {
    const res = await systemService.getHealth(homeId);
    if (res.success && res.data) {
      setData({ ...res.data, localMode: isLocalMode() || res.data.localMode });
      setError(false);
    } else {
      setError(true);
    }
  }, [homeId]);

  useEffect(() => {
    setLocal(isLocalMode());
    return subscribeLocalMode(() => setLocal(isLocalMode()));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useHomeEvents(homeId, { onEvent: () => void load(), onPoll: () => void load() });

  if (!data && !error) return <PageLoader />;
  if (error || !data) return <ErrorState onRetry={load} message="Tidak dapat memuat status sistem." />;

  const rows: { label: string; status: SystemComponentStatus; icon: typeof Server }[] = [
    { label: "Raspberry Pi", status: data.pi, icon: Server },
    { label: "MQTT broker", status: data.mqtt, icon: Radio },
    { label: "Database", status: data.database, icon: Database },
    { label: "Cloud API", status: data.cloud, icon: Cloud },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Sistem</h1>
        <p className="text-sm text-muted">Kesehatan edge, cloud, dan node ESP32</p>
      </div>

      {(local || data.localMode) && (
        <div className="rounded-lg bg-primary text-white px-4 py-3 text-sm font-medium" role="status">
          Mode lokal — aplikasi memakai edge karena cloud tidak terjangkau.
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <Card key={row.label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="flex-1 text-sm font-medium">{row.label}</p>
              <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
            </Card>
          );
        })}
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Sinkronisasi edge</h2>
        </div>
        <p className="text-sm">
          Antrian outbox: <span className="font-semibold">{data.backlog}</span>
        </p>
        <p className="text-sm text-muted">
          Sinkron terakhir: {data.lastSync ? formatRelativeTime(data.lastSync) : "belum pernah"}
        </p>
      </Card>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Node ESP32</h2>
        {data.nodes.map((n) => (
          <Card key={n.nodeId} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-background">
              <Cpu className="h-5 w-5 text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{n.nodeId}</p>
              <p className="text-xs text-muted">
                {n.onlineCount}/{n.deviceCount} perangkat
                {n.lastSeen ? ` · ${formatRelativeTime(n.lastSeen)}` : ""}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[n.status]}>{STATUS_LABEL[n.status]}</Badge>
          </Card>
        ))}
      </section>
    </div>
  );
}

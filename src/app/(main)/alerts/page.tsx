"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHomeEvents } from "@/hooks/useHomeEvents";
import { useToast } from "@/hooks/useToast";
import { alertService } from "@/services/alert.service";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatRelativeTime } from "@/lib/utils";
import type { AlertSeverity, AlertThreshold, HomeAlert } from "@/types";

const SEVERITY_VARIANT: Record<AlertSeverity, "info" | "warning" | "error"> = {
  info: "info",
  warning: "warning",
  critical: "error",
};

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

export default function AlertsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const homeId = session?.selectedHomeId || "home-1";
  const [alerts, setAlerts] = useState<HomeAlert[]>([]);
  const [thresholds, setThresholds] = useState<AlertThreshold[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [acking, setAcking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [alertRes, thrRes] = await Promise.all([
      alertService.getAlerts(homeId),
      alertService.getThresholds(homeId),
    ]);
    if (alertRes.success && alertRes.data) {
      setAlerts(alertRes.data);
      setError(false);
    } else {
      setError(true);
    }
    if (thrRes.success && thrRes.data) {
      setThresholds(thrRes.data);
      setIsAdmin(true);
    } else {
      setThresholds(null);
      setIsAdmin(false);
    }
    setLoading(false);
  }, [homeId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useHomeEvents(homeId, { onEvent: () => void load(), onPoll: () => void load() });

  const grouped = useMemo(() => {
    const open = alerts
      .filter((a) => a.status === "open")
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
    const ack = alerts.filter((a) => a.status === "acknowledged");
    const resolved = alerts.filter((a) => a.status === "resolved");
    return { open, ack, resolved };
  }, [alerts]);

  const ack = async (id: string) => {
    const prev = alerts;
    setAcking(id);
    setAlerts((list) =>
      list.map((a) =>
        a.id === id ? { ...a, status: "acknowledged", acknowledgedAt: new Date().toISOString() } : a
      )
    );
    const res = await alertService.ackAlert(homeId, id);
    if (!res.success) {
      setAlerts(prev);
      showToast(res.error ?? "Gagal mengonfirmasi peringatan.", "error");
    } else {
      showToast("Peringatan dikonfirmasi.", "success");
    }
    setAcking(null);
  };

  const saveThreshold = async (id: string, patch: Partial<AlertThreshold>) => {
    const res = await alertService.updateThreshold(homeId, id, patch);
    if (!res.success) {
      showToast(res.error ?? "Gagal menyimpan ambang.", "error");
      return;
    }
    setThresholds((list) => list?.map((t) => (t.id === id ? { ...t, ...patch } : t)) ?? null);
    showToast("Ambang diperbarui.", "success");
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState onRetry={load} message="Tidak dapat memuat peringatan." />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Peringatan</h1>
        <p className="text-sm text-muted">{grouped.open.length} terbuka</p>
      </div>

      {alerts.length === 0 && (
        <EmptyState icon={Bell} title="Tidak ada peringatan" description="Rumahmu dalam kondisi baik." />
      )}

      <AlertGroup title="Terbuka" items={grouped.open} onAck={ack} acking={acking} />
      <AlertGroup title="Dikonfirmasi" items={grouped.ack} />
      <AlertGroup title="Selesai" items={grouped.resolved} />

      {isAdmin && thresholds && (
        <Card className="space-y-4">
          <h2 className="text-base font-semibold">Pengaturan ambang</h2>
          <p className="text-xs text-muted">Hanya ADMIN. Nilai disimpan di server, bukan di kode aplikasi.</p>
          {thresholds.map((t) => (
            <div key={t.id} className="rounded-lg bg-background p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t.type}</p>
                  <p className="text-xs text-muted">
                    {t.metric} {t.op} {t.value}
                    {t.forSeconds ? ` selama ${t.forSeconds}s` : ""}
                  </p>
                </div>
                <Toggle
                  checked={t.enabled}
                  onChange={(v) => void saveThreshold(t.id, { enabled: v })}
                  label={`Aktifkan ${t.type}`}
                />
              </div>
              <Input
                type="number"
                label="Nilai"
                defaultValue={t.value}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isNaN(value) && value !== t.value) {
                    void saveThreshold(t.id, { value });
                  }
                }}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function AlertGroup({
  title,
  items,
  onAck,
  acking,
}: {
  title: string;
  items: HomeAlert[];
  onAck?: (id: string) => void;
  acking?: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted">{title}</h2>
      {items.map((a) => (
        <Card key={a.id} className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{a.title}</p>
            <Badge variant={SEVERITY_VARIANT[a.severity]}>{a.severity}</Badge>
          </div>
          <p className="text-sm text-muted">{a.message}</p>
          <p className="text-xs text-muted">
            {[a.deviceName, a.roomName].filter(Boolean).join(" · ") || a.type} · {formatRelativeTime(a.createdAt)}
          </p>
          {onAck && a.status === "open" && (
            <Button size="sm" variant="outline" isLoading={acking === a.id} onClick={() => onAck(a.id)}>
              Konfirmasi
            </Button>
          )}
        </Card>
      ))}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHomes } from "@/hooks/useHomes";
import { operatorService, type MaintenanceDevice } from "@/services/operator.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Wrench, Building2, RefreshCw, WifiOff, HelpCircle, CheckCircle2, AlertTriangle } from "lucide-react";

const STATUS_META: Record<string, { label: string; cls: string; Icon: typeof WifiOff }> = {
  offline: { label: "Offline", cls: "text-danger", Icon: WifiOff },
  unknown: { label: "Tidak diketahui", cls: "text-warning", Icon: HelpCircle },
  online: { label: "Online", cls: "text-success", Icon: CheckCircle2 },
};

export default function OperatorPage() {
  const { session } = useAuth();
  const homes = useHomes();
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [devices, setDevices] = useState<MaintenanceDevice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const buildings = useMemo(() => {
    const seen = new Map<string, string>();
    for (const h of homes) if (h.buildingId && !seen.has(h.buildingId)) seen.set(h.buildingId, h.location || h.name);
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [homes]);

  useEffect(() => {
    if (buildingId) return;
    const current = homes.find((h) => h.id === session?.selectedHomeId);
    setBuildingId(current?.buildingId ?? buildings[0]?.id ?? null);
  }, [homes, session, buildings, buildingId]);

  const refresh = useCallback(async () => {
    if (!buildingId) return;
    const res = await operatorService.getMaintenance(buildingId);
    if (res.success && res.data) setDevices(res.data);
    else if (!res.success) setDevices([]);
  }, [buildingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggleMaintenance(d: MaintenanceDevice) {
    setBusy(d.deviceId);
    try {
      await operatorService.setMaintenance(d.deviceId, !d.underMaintenance);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function resolve(d: MaintenanceDevice) {
    setBusy(d.deviceId);
    try {
      await operatorService.resolveAlerts(d.deviceId);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const faults = devices.filter((d) => d.status !== "online" || d.openAlerts.length > 0);

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Maintenance
          </h1>
          <p className="text-sm text-muted">Perangkat rusak / offline yang perlu ditangani.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {buildings.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {buildings.map((b) => (
            <button
              key={b.id}
              onClick={() => setBuildingId(b.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                buildingId === b.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
              )}
            >
              <Building2 className="h-3.5 w-3.5" /> {b.label}
            </button>
          ))}
        </div>
      )}

      <Card className="p-4 flex items-center gap-3">
        <div className={cn("rounded-xl p-2", faults.length ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{faults.length}</p>
          <p className="text-xs text-muted">perangkat perlu perhatian</p>
        </div>
      </Card>

      {devices.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          Semua perangkat sehat 🎉
        </Card>
      ) : (
        devices.map((d) => {
          const meta = STATUS_META[d.status] ?? STATUS_META.unknown;
          return (
            <Card key={d.deviceId} className={cn("p-4", d.underMaintenance && "border-warning/40 bg-warning/5")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-xs text-muted">
                    {d.homeName} · {d.roomName} · {d.type}
                  </p>
                  <p className={cn("mt-1 inline-flex items-center gap-1 text-xs", meta.cls)}>
                    <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
                    {d.lastSeen && (
                      <span className="text-muted">
                        · terakhir {new Date(d.lastSeen).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </p>
                  {d.underMaintenance && (
                    <span className="mt-1 inline-block rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">
                      Sedang diperbaiki
                    </span>
                  )}
                </div>
              </div>

              {d.openAlerts.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {d.openAlerts.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-xs text-danger">
                      <AlertTriangle className="h-3.5 w-3.5" /> {a.title}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy === d.deviceId} onClick={() => toggleMaintenance(d)}>
                  {d.underMaintenance ? "Selesai perbaikan" : "Tandai perbaikan"}
                </Button>
                {d.openAlerts.length > 0 && (
                  <Button size="sm" disabled={busy === d.deviceId} onClick={() => resolve(d)}>
                    Tuntaskan {d.openAlerts.length} alert
                  </Button>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHomes } from "@/hooks/useHomes";
import { billingService, type BuildingUnit } from "@/services/billing.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import { Building2, PowerOff, Wallet, RefreshCw } from "lucide-react";

export default function ManagePage() {
  const { session } = useAuth();
  const homes = useHomes();
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [units, setUnits] = useState<BuildingUnit[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Buildings the user can manage, derived from their units.
  const buildings = useMemo(() => {
    const seen = new Map<string, string>();
    for (const h of homes) {
      if (h.buildingId && !seen.has(h.buildingId)) seen.set(h.buildingId, h.location || h.name);
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [homes]);

  // Default to the building of the currently selected unit.
  useEffect(() => {
    if (buildingId) return;
    const current = homes.find((h) => h.id === session?.selectedHomeId);
    setBuildingId(current?.buildingId ?? buildings[0]?.id ?? null);
  }, [homes, session, buildings, buildingId]);

  const refresh = useCallback(async () => {
    if (!buildingId) return;
    const res = await billingService.getBuildingUnits(buildingId);
    if (res.success && res.data) setUnits(res.data);
    else if (!res.success) setUnits([]);
  }, [buildingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function generate() {
    if (!buildingId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await billingService.generateBuildingInvoices(buildingId);
      if (res.success && res.data) {
        setMsg(`${res.data.length} tagihan bulan ini dibuat.`);
        await refresh();
      } else {
        setMsg(res.error ?? "Gagal membuat tagihan.");
      }
    } finally {
      setBusy(false);
    }
  }

  const totalArrears = units.reduce((s, u) => s + u.arrearsIdr, 0);

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Konsol Pengelola</h1>
          <p className="text-sm text-muted">Tagihan, tunggakan &amp; status utilitas seluruh unit.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Building selector */}
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

      {/* Summary + action */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Total tunggakan gedung</p>
          <p className="text-2xl font-bold">{formatCurrency(totalArrears)}</p>
          <p className="text-xs text-muted">{units.length} unit</p>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-muted">{msg}</span>}
          <Button size="sm" disabled={busy} onClick={generate}>
            Buat tagihan bulan ini
          </Button>
        </div>
      </Card>

      {/* Units table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Mode</th>
                <th className="px-4 py-2 font-medium text-right">Tunggakan</th>
                <th className="px-4 py-2 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((u) => (
                <tr key={u.homeId}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted">{u.floorLabel}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.prepaid ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Wallet className="h-3.5 w-3.5" /> Prabayar
                        {u.prepaidBalanceIdr != null && (
                          <span className="text-muted">({formatCurrency(u.prepaidBalanceIdr)})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Pascabayar</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {u.arrearsIdr > 0 ? (
                      <span className="font-medium text-warning">{formatCurrency(u.arrearsIdr)}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    {u.unpaidCount > 0 && (
                      <span className="ml-1 text-xs text-muted">({u.unpaidCount})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {u.disconnected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                        <PowerOff className="h-3 w-3" /> Terputus
                      </span>
                    ) : (
                      <span className="text-xs text-success">Aktif</span>
                    )}
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                    Belum ada unit atau kamu bukan pengelola gedung ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

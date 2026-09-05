"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { communityService, type Parcel } from "@/services/community.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { Package, PackageCheck, PlusCircle } from "lucide-react";

export default function ParcelsPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [courier, setCourier] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!homeId) return;
    const res = await communityService.getParcels(homeId);
    if (res.success && res.data) setParcels(res.data);
  }, [homeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function logArrival() {
    if (!homeId) return;
    setBusy(true);
    try {
      await communityService.createParcel(homeId, {
        courier: courier.trim() || undefined,
        description: desc.trim() || undefined,
      });
      setCourier("");
      setDesc("");
      setLogOpen(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function pickup(id: string) {
    if (!homeId) return;
    const res = await communityService.pickupParcel(homeId, id);
    if (res.success && res.data) {
      setParcels((prev) => prev.map((p) => (p.id === id ? res.data! : p)));
    }
  }

  const waiting = parcels.filter((p) => p.status === "arrived");

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Paket &amp; Loker</h1>
          <p className="text-sm text-muted">{waiting.length} paket menunggu diambil.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setLogOpen((v) => !v)}>
          <PlusCircle className="h-4 w-4" /> Catat (satpam)
        </Button>
      </div>

      {logOpen && (
        <Card className="p-3 space-y-2">
          <input
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="Kurir (mis. JNE)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Keterangan paket"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <Button size="sm" disabled={busy} onClick={logArrival}>
            Catat kedatangan
          </Button>
        </Card>
      )}

      {parcels.length === 0 ? (
        <EmptyState icon={Package} title="Belum ada paket" description="Paket yang tiba di lobby akan muncul di sini." />
      ) : (
        parcels.map((p) => {
          const picked = p.status === "picked_up";
          return (
            <Card key={p.id} className={cn("p-4", picked && "opacity-60")}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-xl p-2", picked ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                    {picked ? <PackageCheck className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium">{p.description}</p>
                    <p className="text-xs text-muted">
                      {p.courier || "Kurir"} · tiba{" "}
                      {new Date(p.arrivedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {!picked && (
                      <p className="mt-1 font-mono text-sm">
                        Kode ambil: <span className="font-bold">{p.code}</span>
                      </p>
                    )}
                  </div>
                </div>
                {!picked && (
                  <Button size="sm" onClick={() => pickup(p.id)}>
                    Ambil
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

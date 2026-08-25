"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Cpu } from "lucide-react";
import { deviceService } from "@/services/home.service";
import { useAuth } from "@/hooks/useAuth";
import { useHomeEvents } from "@/hooks/useHomeEvents";
import { DeviceCard } from "@/components/devices/DeviceCard";
import { DeviceListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Search } from "@/components/ui/Search";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import type { Device } from "@/types";

function DevicesContent() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<{ id: string; label: string }[]>([]);

  const homeId = session?.selectedHomeId || "home-1";

  const loadDevices = useCallback(async () => {
    setError(false);
    const [deviceResult, filterList] = await Promise.all([
      deviceService.getDevices(homeId, filter, 1, 100),
      deviceService.getFilters(),
    ]);
    if (deviceResult.success && deviceResult.data) {
      setDevices(deviceResult.data.items);
    } else {
      setError(true);
    }
    setFilters(filterList);
    setLoading(false);
  }, [homeId, filter]);

  useEffect(() => {
    setFilter(searchParams.get("filter") || "all");
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    void loadDevices();
  }, [loadDevices]);

  useHomeEvents(homeId, {
    onEvent: (evt) => {
      if (!evt.deviceId) {
        void loadDevices();
        return;
      }
      setDevices((list) =>
        list.map((d) => {
          if (d.id !== evt.deviceId) return d;
          const status =
            typeof evt.data.status === "string" ? (evt.data.status as Device["status"]) : d.status;
          return { ...d, status, lastUpdated: evt.ts, lastSeen: evt.ts };
        })
      );
    },
    onPoll: () => void loadDevices(),
  });

  const filtered = devices.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.room.toLowerCase().includes(search.toLowerCase()) ||
      (d.nodeId ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const groups = useMemo(() => {
    const map = new Map<string, Device[]>();
    for (const d of filtered) {
      const key = d.nodeId || "tanpa-node";
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Perangkat Saya</h1>
          <p className="text-sm text-muted">{devices.length} perangkat · dikelompokkan per node</p>
        </div>
        <Link href="/devices/add">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </Link>
      </div>

      <Search
        placeholder="Cari perangkat atau node..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        <SegmentedControl
          options={filters.map((f) => ({ id: f.id, label: f.label }))}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {loading && <DeviceListSkeleton />}
      {error && !loading && (
        <ErrorState onRetry={loadDevices} message="Tidak dapat memuat perangkat." />
      )}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Cpu}
          title="Belum ada perangkat"
          description="Tambah perangkat pintar pertamamu dan mulai buat rumahmu lebih cerdas."
          actionLabel="Tambah Perangkat"
          onAction={() => (window.location.href = "/devices/add")}
        />
      )}
      {!loading && !error && groups.length > 0 && (
        <div className="space-y-6">
          {groups.map(([nodeId, list]) => {
            const online = list.some((d) => d.status === "online");
            return (
              <section key={nodeId} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{nodeId}</p>
                    <p className="text-xs text-muted">
                      {list.filter((d) => d.status === "online").length}/{list.length} online
                    </p>
                  </div>
                  {online ? <StatusBadge status="online" /> : <Badge variant="error">Node offline</Badge>}
                </div>
                {list.map((device) => (
                  <DeviceCard key={device.id} device={device} showControl />
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DevicesPage() {
  return (
    <Suspense fallback={<DeviceListSkeleton />}>
      <DevicesContent />
    </Suspense>
  );
}

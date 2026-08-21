"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { deviceService } from "@/services/home.service";
import { useAuth } from "@/hooks/useAuth";
import { DeviceCard } from "@/components/devices/DeviceCard";
import { DeviceListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Search } from "@/components/ui/Search";
import type { Device } from "@/types";
import { Cpu } from "lucide-react";

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

  const loadDevices = async () => {
    setLoading(true);
    setError(false);
    const [deviceResult, filterList] = await Promise.all([
      deviceService.getDevices(homeId, filter),
      deviceService.getFilters(),
    ]);
    if (deviceResult.success && deviceResult.data) {
      setDevices(deviceResult.data.items);
    } else {
      setError(true);
    }
    setFilters(filterList);
    setLoading(false);
  };

  // Sync the active filter when arriving via a ?filter= link (dashboard
  // "Energi"/"Air"/"Lampu" shortcuts, the sidebar menu, or AI insight CTAs).
  useEffect(() => {
    setFilter(searchParams.get("filter") || "all");
  }, [searchParams]);

  useEffect(() => {
    loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId, filter]);

  const filtered = devices.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.room.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Perangkat Saya</h1>
          <p className="text-sm text-muted">{devices.length} perangkat</p>
        </div>
        <Link href="/devices/add">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </Link>
      </div>

      <Search
        placeholder="Cari perangkat..."
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
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((device) => (
            <DeviceCard key={device.id} device={device} showControl />
          ))}
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

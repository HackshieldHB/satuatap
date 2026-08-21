"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { homeService, deviceService } from "@/services/home.service";
import { useAuth } from "@/hooks/useAuth";
import { DeviceCard } from "@/components/devices/DeviceCard";
import { DeviceListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getRoomVisual } from "@/lib/roomVisuals";
import { ArrowLeft, Thermometer, Cpu, Wifi } from "lucide-react";
import type { Room, Device } from "@/types";

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";

  const [room, setRoom] = useState<Room | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    const [roomsRes, devicesRes] = await Promise.all([
      homeService.getRooms(homeId),
      deviceService.getDevices(homeId, "all", 1, 100),
    ]);
    if (roomsRes.success && roomsRes.data) {
      setRoom(roomsRes.data.find((r) => r.id === roomId) ?? null);
    } else {
      setError(true);
    }
    if (devicesRes.success && devicesRes.data) {
      setDevices(devicesRes.data.items.filter((d) => d.roomId === roomId));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId, roomId]);

  const visual = getRoomVisual(room?.name ?? "");
  const Icon = visual.icon;
  const onlineCount = devices.filter((d) => d.status === "online").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <Link
        href="/rooms"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Ruangan
      </Link>

      {loading ? (
        <DeviceListSkeleton />
      ) : error ? (
        <ErrorState onRetry={loadData} message="Tidak dapat memuat ruangan." />
      ) : !room ? (
        <EmptyState
          icon={Cpu}
          title="Ruangan tidak ditemukan"
          description="Ruangan ini mungkin sudah dihapus."
        />
      ) : (
        <>
          <div
            className={cn(
              "relative overflow-hidden rounded-hero border border-border/50 bg-gradient-to-br p-5 animate-pop-in",
              visual.gradient
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl bg-surface shadow-card",
                  visual.color.split(" ").find((c) => c.startsWith("text-"))
                )}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{room.name}</h1>
                <p className="text-sm text-muted">
                  {room.deviceCount} perangkat · {room.activeDevices} aktif
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat
                icon={<Wifi className="h-4 w-4 text-success" />}
                value={`${onlineCount}`}
                label="Online"
              />
              <Stat
                icon={<Cpu className="h-4 w-4 text-primary" />}
                value={`${devices.length}`}
                label="Perangkat"
              />
              <Stat
                icon={<Thermometer className="h-4 w-4 text-secondary" />}
                value={
                  room.temperature !== undefined ? `${room.temperature}°` : "—"
                }
                label="Suhu"
              />
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Perangkat di ruangan ini</h2>
            {devices.length === 0 ? (
              <EmptyState
                icon={Cpu}
                title="Belum ada perangkat"
                description="Tambahkan perangkat ke ruangan ini dari menu Perangkat."
              />
            ) : (
              <div className="space-y-3">
                {devices.map((device, i) => (
                  <div
                    key={device.id}
                    className="animate-pop-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <DeviceCard device={device} showControl />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-lg bg-surface/70 backdrop-blur-sm p-3 text-center">
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-bold mt-1 leading-none">{value}</p>
      <p className="text-[10px] text-muted mt-1">{label}</p>
    </div>
  );
}

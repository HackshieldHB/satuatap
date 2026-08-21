"use client";

import { useEffect, useState } from "react";
import { homeService } from "@/services/home.service";
import { useAuth } from "@/hooks/useAuth";
import { RoomCard } from "@/components/rooms/RoomCard";
import { DeviceListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Room } from "@/types";
import { DoorOpen } from "lucide-react";

export default function RoomsPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId || "home-1";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    const result = await homeService.getRooms(homeId);
    if (result.success && result.data) setRooms(result.data);
    else setError(true);
    setLoading(false);
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Ruangan</h1>
        <p className="text-sm text-muted">{rooms.length} ruangan di rumahmu</p>
      </div>

      {loading && <DeviceListSkeleton />}
      {error && !loading && (
        <ErrorState onRetry={loadRooms} message="Tidak dapat memuat ruangan." />
      )}
      {!loading && !error && rooms.length === 0 && (
        <EmptyState
          icon={DoorOpen}
          title="Belum ada ruangan"
          description="Ruangan akan otomatis dibuat saat kamu menambahkan perangkat."
        />
      )}
      {!loading && !error && rooms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rooms.map((room, i) => (
            <RoomCard key={room.id} room={room} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ChevronRight, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoomVisual } from "@/lib/roomVisuals";
import type { Room } from "@/types";

interface RoomCardProps {
  room: Room;
  index?: number;
}

export function RoomCard({ room, index = 0 }: RoomCardProps) {
  const { icon: Icon, color } = getRoomVisual(room.name);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="block animate-pop-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-floating">
        {room.activeDevices > 0 && (
          <span
            className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-secondary"
            aria-hidden
          />
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6",
                color
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{room.name}</p>
              <p className="text-xs text-muted">
                {room.deviceCount} perangkat · {room.activeDevices} aktif
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {room.temperature !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted">
                <Thermometer className="h-3 w-3" />
                {room.temperature}°C
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

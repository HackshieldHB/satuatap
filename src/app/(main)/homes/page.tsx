"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { homeService } from "@/services/home.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { Check, Plus, MapPin } from "lucide-react";
import type { Home } from "@/types";

export default function HomesPage() {
  const { session, updateSelectedHome } = useAuth();
  const { showToast } = useToast();
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedHomeId = session?.selectedHomeId || "home-1";

  useEffect(() => {
    homeService.getHomes().then((res) => {
      if (res.success && res.data) setHomes(res.data);
      setLoading(false);
    });
  }, []);

  const handleSelect = (home: Home) => {
    if (home.id === selectedHomeId) return;
    updateSelectedHome(home.id);
    showToast(`Beralih ke ${home.name}.`, "success");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Rumah Saya</h1>
          <p className="text-sm text-muted">Kelola dan beralih antar rumah</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() =>
            showToast(
              "Fitur tambah rumah akan hadir di fase berikutnya.",
              "info"
            )
          }
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="space-y-3">
          {homes.map((home) => {
            const active = home.id === selectedHomeId;
            return (
              <Card
                key={home.id}
                onClick={() => handleSelect(home)}
                className={cn(
                  "flex items-center gap-4 cursor-pointer transition-colors",
                  active && "border-primary/40 bg-primary/5"
                )}
              >
                <span className="text-3xl" aria-hidden>
                  {home.type === "villa" ? "🏡" : "🏠"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{home.name}</p>
                    {active && <Badge variant="secondary">Aktif</Badge>}
                  </div>
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {home.location}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {home.deviceCount} perangkat · {home.roomCount} ruangan
                  </p>
                </div>
                {active && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

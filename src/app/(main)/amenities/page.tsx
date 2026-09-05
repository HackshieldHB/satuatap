"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { communityService, type Amenity, type AmenityBooking } from "@/services/community.service";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { CalendarCheck, X } from "lucide-react";

// Next hourly slots (whole UTC hours) starting from the upcoming hour.
function nextSlots(openHour: number, closeHour: number, count = 8): Date[] {
  const out: Date[] = [];
  const now = new Date();
  const cur = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1));
  for (let i = 0; out.length < count && i < 48; i++) {
    const d = new Date(cur.getTime() + i * 3600_000);
    if (d.getUTCHours() >= openHour && d.getUTCHours() < closeHour) out.push(d);
  }
  return out;
}

function slotLabel(d: Date): string {
  return d.toLocaleString("id-ID", { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AmenitiesPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [bookings, setBookings] = useState<AmenityBooking[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!homeId) return;
    const [a, b] = await Promise.all([
      communityService.getAmenities(homeId),
      communityService.getBookings(homeId),
    ]);
    if (a.success && a.data) setAmenities(a.data);
    if (b.success && b.data) setBookings(b.data);
  }, [homeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function book(amenityId: string, iso: string) {
    if (!homeId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await communityService.book(homeId, amenityId, iso);
      setMsg(res.success ? "Berhasil dipesan." : res.error ?? "Gagal memesan.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!homeId) return;
    await communityService.cancelBooking(homeId, id);
    await refresh();
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Fasilitas</h1>
        <p className="text-sm text-muted">Pesan gym, aula &amp; kolam gedung kamu.</p>
      </div>

      {msg && <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">{msg}</div>}

      {/* My bookings */}
      {bookings.length > 0 && (
        <Card className="p-4">
          <p className="font-semibold mb-2 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" /> Booking saya
          </p>
          <ul className="space-y-2">
            {bookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <span>
                  {b.amenityEmoji} {b.amenityName} · {slotLabel(new Date(b.startsAt))}
                </span>
                <button onClick={() => cancel(b.id)} className="text-muted hover:text-danger" title="Batalkan">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Amenities */}
      {amenities.map((a) => {
        const booked = new Set(a.bookings.map((b) => b.startsAt));
        const open = selected === a.id;
        return (
          <Card key={a.id} className="p-4">
            <button className="flex w-full items-center justify-between" onClick={() => setSelected(open ? null : a.id)}>
              <span className="flex items-center gap-2 font-semibold">
                <span className="text-xl">{a.emoji}</span> {a.name}
              </span>
              <span className="text-xs text-muted">
                {String(a.openHour).padStart(2, "0")}:00–{String(a.closeHour).padStart(2, "0")}:00
              </span>
            </button>
            {open && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {nextSlots(a.openHour, a.closeHour).map((d) => {
                  const iso = d.toISOString();
                  const taken = booked.has(iso);
                  return (
                    <button
                      key={iso}
                      disabled={taken || busy}
                      onClick={() => book(a.id, iso)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-xs",
                        taken
                          ? "cursor-not-allowed border-border bg-surface-2 text-muted line-through"
                          : "border-border hover:border-primary hover:text-primary"
                      )}
                    >
                      {slotLabel(d)}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

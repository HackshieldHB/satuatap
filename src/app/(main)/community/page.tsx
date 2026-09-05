"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHomes } from "@/hooks/useHomes";
import { communityService, type Announcement, type Ticket } from "@/services/community.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Megaphone, Pin, Wrench, MessageSquarePlus, Send } from "lucide-react";

const CAT_STYLE: Record<string, string> = {
  info: "bg-primary/10 text-primary",
  maintenance: "bg-warning/10 text-warning",
  event: "bg-success/10 text-success",
  urgent: "bg-danger/10 text-danger",
};
const TICKET_CATS = [
  { id: "plumbing", label: "Air/Pipa" },
  { id: "electrical", label: "Listrik" },
  { id: "cleanliness", label: "Kebersihan" },
  { id: "security", label: "Keamanan" },
  { id: "other", label: "Lainnya" },
];
const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Terbuka", cls: "bg-warning/10 text-warning" },
  in_progress: { label: "Diproses", cls: "bg-primary/10 text-primary" },
  resolved: { label: "Selesai", cls: "bg-success/10 text-success" },
};

export default function CommunityPage() {
  const { session } = useAuth();
  const homes = useHomes();
  const homeId = session?.selectedHomeId ?? null;
  const buildingId = useMemo(
    () => homes.find((h) => h.id === homeId)?.buildingId ?? null,
    [homes, homeId]
  );

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cat, setCat] = useState("other");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [annOpen, setAnnOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");

  const refresh = useCallback(async () => {
    if (!homeId) return;
    const [a, t] = await Promise.all([
      communityService.getAnnouncements(homeId),
      communityService.getTickets(homeId),
    ]);
    if (a.success && a.data) setAnnouncements(a.data);
    if (t.success && t.data) setTickets(t.data);
  }, [homeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitTicket() {
    if (!homeId || !title.trim() || !desc.trim()) return;
    setBusy(true);
    try {
      await communityService.createTicket(homeId, { category: cat, title: title.trim(), description: desc.trim() });
      setTitle("");
      setDesc("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function postAnnouncement() {
    if (!buildingId || !annTitle.trim() || !annBody.trim()) return;
    setBusy(true);
    try {
      const res = await communityService.createAnnouncement(buildingId, { title: annTitle.trim(), body: annBody.trim() });
      if (res.success) {
        setAnnTitle("");
        setAnnBody("");
        setAnnOpen(false);
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Komunitas</h1>
        <p className="text-sm text-muted">Pengumuman gedung &amp; laporan/komplain ke pengelola.</p>
      </div>

      {/* Announcements */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Pengumuman
          </h2>
          <Button size="sm" variant="ghost" onClick={() => setAnnOpen((v) => !v)}>
            + Buat (pengelola)
          </Button>
        </div>

        {annOpen && (
          <Card className="p-3 space-y-2">
            <input
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="Judul pengumuman"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <textarea
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              placeholder="Isi pengumuman"
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <Button size="sm" disabled={busy || !annTitle.trim() || !annBody.trim()} onClick={postAnnouncement}>
              <Send className="h-4 w-4" /> Kirim ke seluruh unit
            </Button>
          </Card>
        )}

        {announcements.map((a) => (
          <Card key={a.id} className="p-3">
            <div className="flex items-center gap-2">
              {a.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
              <p className="font-medium">{a.title}</p>
              <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs", CAT_STYLE[a.category])}>
                {a.category}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{a.body}</p>
          </Card>
        ))}
      </section>

      {/* New complaint */}
      <Card className="p-4 space-y-3">
        <p className="font-semibold flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" /> Lapor / komplain
        </p>
        <div className="flex flex-wrap gap-2">
          {TICKET_CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                cat === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul singkat"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Ceritakan masalahnya…"
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <Button size="sm" disabled={busy || !title.trim() || !desc.trim()} onClick={submitTicket}>
          Kirim laporan
        </Button>
      </Card>

      {/* My tickets */}
      {tickets.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Laporan saya
          </h2>
          {tickets.map((t) => {
            const s = TICKET_STATUS[t.status];
            return (
              <Card key={t.id} className="p-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t.title}</p>
                  <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs", s.cls)}>{s.label}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{t.description}</p>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}

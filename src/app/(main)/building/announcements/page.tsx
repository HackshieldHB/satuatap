"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MOCK_ANNOUNCEMENTS } from "@/data/mock";
import { ArrowLeft, Pin } from "lucide-react";
import type { AnnouncementCategory } from "@/types";

const CAT: Record<
  AnnouncementCategory,
  { label: string; variant: "info" | "warning" | "secondary" | "error" }
> = {
  info: { label: "Info", variant: "info" },
  maintenance: { label: "Pemeliharaan", variant: "warning" },
  event: { label: "Acara", variant: "secondary" },
  security: { label: "Keamanan", variant: "error" },
};

export default function AnnouncementsPage() {
  const items = [...MOCK_ANNOUNCEMENTS].sort(
    (a, b) => Number(!!b.pinned) - Number(!!a.pinned)
  );

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <Link
        href="/building"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Gedung
      </Link>

      <h1 className="text-xl font-bold">Pengumuman</h1>

      <div className="space-y-3">
        {items.map((a, i) => {
          const cat = CAT[a.category];
          return (
            <Card
              key={a.id}
              className="space-y-2 animate-pop-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-2">
                {a.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                <Badge variant={cat.variant}>{cat.label}</Badge>
                <span className="text-xs text-muted ml-auto">
                  {new Date(a.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-sm text-muted leading-relaxed">{a.body}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { communityService, type Announcement } from "@/services/community.service";
import { cn } from "@/lib/utils";
import {
  Megaphone,
  Wrench,
  QrCode,
  Receipt,
  ChevronRight,
  Building2,
} from "lucide-react";

// Hub tiles now point at the real feature pages (community, access, invoices).
const FEATURES = [
  {
    href: "/community",
    label: "Pengumuman",
    desc: "Info dari pengelola",
    icon: Megaphone,
    color: "bg-info/10 text-info",
  },
  {
    href: "/community",
    label: "Lapor Kerusakan",
    desc: "Lift, lampu, kebersihan",
    icon: Wrench,
    color: "bg-warning/10 text-warning",
  },
  {
    href: "/access",
    label: "Akses Tamu",
    desc: "Kode/QR tamu ke lobby",
    icon: QrCode,
    color: "bg-secondary/10 text-secondary",
  },
  {
    href: "/invoices",
    label: "Bayar IPL",
    desc: "Iuran gedung & utilitas",
    icon: Receipt,
    color: "bg-primary/10 text-primary",
  },
];

export default function BuildingPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [latest, setLatest] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!homeId) return;
    let alive = true;
    void communityService.getAnnouncements(homeId).then((res) => {
      if (alive && res.success && res.data) {
        setLatest(res.data.find((a) => a.pinned) ?? res.data[0] ?? null);
      }
    });
    return () => {
      alive = false;
    };
  }, [homeId]);

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Gedung</h1>
          <p className="text-sm text-muted">Layanan &amp; komunitas gedung kamu</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.label}
              href={f.href}
              style={{ animationDelay: `${i * 50}ms` }}
              className="group animate-pop-in rounded-lg border border-border/50 bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-floating"
            >
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                  f.color
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold mt-2">{f.label}</p>
              <p className="text-xs text-muted">{f.desc}</p>
            </Link>
          );
        })}
      </div>

      {latest && (
        <Link href="/community">
          <Card className="flex items-center gap-3 hover:shadow-floating transition-shadow">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-info">Pengumuman terbaru</p>
              <p className="text-sm font-semibold truncate">{latest.title}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted shrink-0" />
          </Card>
        </Link>
      )}
    </div>
  );
}

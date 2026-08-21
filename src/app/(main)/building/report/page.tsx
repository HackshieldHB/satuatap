"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { MOCK_REPORTS, REPORT_CATEGORIES } from "@/data/mock";
import { ArrowLeft, ImagePlus } from "lucide-react";
import type { MaintenanceReport, ReportStatus } from "@/types";

const STATUS: Record<
  ReportStatus,
  { label: string; variant: "info" | "warning" | "success" }
> = {
  submitted: { label: "Dikirim", variant: "info" },
  in_progress: { label: "Diproses", variant: "warning" },
  resolved: { label: "Selesai", variant: "success" },
};

export default function ReportPage() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<MaintenanceReport[]>(() =>
    MOCK_REPORTS.map((r) => ({ ...r }))
  );
  const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");

  const submit = () => {
    if (!location.trim() || !desc.trim()) return;
    setReports((prev) => [
      {
        id: `rep-${Date.now()}`,
        category,
        description: desc.trim(),
        location: location.trim(),
        status: "submitted",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setLocation("");
    setDesc("");
    showToast("Laporan terkirim ke pengelola ✅", "success");
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <Link
        href="/building"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Gedung
      </Link>

      <h1 className="text-xl font-bold">Lapor Kerusakan</h1>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1.5">Kategori</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  category === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted hover:text-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Lokasi"
          placeholder="mis. Koridor Lantai 12"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium mb-1.5">Deskripsi</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Jelaskan kerusakannya..."
            rows={3}
            className="w-full rounded-md border border-border bg-surface p-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="button"
          onClick={() => showToast("Kamera akan tersedia di fase berikutnya.", "info")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm text-muted hover:border-primary/40"
        >
          <ImagePlus className="h-5 w-5" />
          Tambah Foto
        </button>

        <Button
          className="w-full"
          onClick={submit}
          disabled={!location.trim() || !desc.trim()}
        >
          Kirim Laporan
        </Button>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Laporan Kamu</h2>
        {reports.map((r) => {
          const s = STATUS[r.status];
          return (
            <Card key={r.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{r.category}</p>
                <Badge variant={s.variant} className="ml-auto">
                  {s.label}
                </Badge>
              </div>
              <p className="text-xs text-muted">{r.location}</p>
              <p className="text-sm text-muted">{r.description}</p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

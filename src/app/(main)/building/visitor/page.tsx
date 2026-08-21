"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MockQr } from "@/components/payments/MockQr";
import { useToast } from "@/hooks/useToast";
import { ArrowLeft, ShieldCheck, QrCode } from "lucide-react";
import type { VisitorPass } from "@/types";

function genCode() {
  return "VP-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function VisitorPage() {
  const { showToast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState(today);
  const [passes, setPasses] = useState<VisitorPass[]>([]);

  const create = () => {
    if (!name.trim()) return;
    const pass: VisitorPass = {
      id: `vp-${Date.now()}`,
      name: name.trim(),
      purpose: purpose.trim() || "Kunjungan",
      date,
      code: genCode(),
    };
    setPasses((prev) => [pass, ...prev]);
    setName("");
    setPurpose("");
    showToast("Visitor pass dibuat 🎫", "success");
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

      <div>
        <h1 className="text-xl font-bold">Visitor Pass</h1>
        <p className="text-sm text-muted">
          Buat QR akses untuk tamu — tunjukkan ke security di lobby.
        </p>
      </div>

      <Card className="space-y-4">
        <Input
          label="Nama Tamu"
          placeholder="Nama lengkap tamu"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Keperluan"
          placeholder="mis. Antar paket, keluarga"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
        <Input
          label="Tanggal Kunjungan"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button className="w-full" onClick={create} disabled={!name.trim()}>
          Buat QR Pass
        </Button>
      </Card>

      {passes.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs text-muted">
          <ShieldCheck className="h-4 w-4 text-secondary shrink-0" />
          Pass berlaku 1 hari dan otomatis kedaluwarsa setelah tamu masuk.
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Pass Aktif</h2>
          {passes.map((p) => (
            <Card key={p.id} className="flex items-center gap-4">
              <div className="rounded-lg border border-border bg-white p-2 shrink-0">
                <MockQr seed={p.code} className="h-24 w-24" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted">{p.purpose}</p>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(p.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-bold text-primary">
                  <QrCode className="h-3.5 w-3.5" />
                  {p.code}
                </p>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

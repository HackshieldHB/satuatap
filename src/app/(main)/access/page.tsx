"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { accessService, type AccessPass, type AccessLog } from "@/services/access.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { DoorOpen, KeyRound, UserPlus, ShieldCheck, ShieldX, Trash2, Clock } from "lucide-react";

const DURATIONS = [
  { label: "2 jam", minutes: 120 },
  { label: "1 hari", minutes: 1440 },
  { label: "7 hari", minutes: 10080 },
];

export default function AccessPage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [passes, setPasses] = useState<AccessPass[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"guest" | "courier">("guest");
  const [minutes, setMinutes] = useState(120);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [verifyMsg, setVerifyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!homeId) return;
    const [p, l] = await Promise.all([accessService.getPasses(homeId), accessService.getLogs(homeId)]);
    if (p.success && p.data) setPasses(p.data);
    if (l.success && l.data) setLogs(l.data);
  }, [homeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function create() {
    if (!homeId || !label.trim()) return;
    setBusy(true);
    try {
      await accessService.createPass(homeId, { label: label.trim(), kind, validMinutes: minutes });
      setLabel("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!homeId) return;
    await accessService.revokePass(homeId, id);
    await refresh();
  }

  async function unlock() {
    if (!homeId) return;
    setBusy(true);
    try {
      const res = await accessService.unlock(homeId);
      setVerifyMsg(res.success ? { ok: true, text: "Pintu dibuka." } : { ok: false, text: res.error ?? "Gagal." });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!homeId || !code.trim()) return;
    const res = await accessService.verify(homeId, code.trim());
    if (res.success && res.data?.granted) {
      setVerifyMsg({ ok: true, text: `Akses diberikan: ${res.data.label}` });
    } else {
      setVerifyMsg({ ok: false, text: res.data?.error ?? "Akses ditolak." });
    }
    setCode("");
    await refresh();
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Akses &amp; Tamu</h1>
        <p className="text-sm text-muted">Kunci pintu, kode tamu berjangka, &amp; riwayat akses.</p>
      </div>

      {/* Resident unlock */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Buka pintu saya</p>
            <p className="text-xs text-muted">Kirim perintah buka ke kunci solenoid.</p>
          </div>
        </div>
        <Button size="sm" disabled={busy} onClick={unlock}>
          Buka
        </Button>
      </Card>

      {verifyMsg && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
            verifyMsg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          )}
        >
          {verifyMsg.ok ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
          {verifyMsg.text}
        </div>
      )}

      {/* Create pass */}
      <Card className="p-4 space-y-3">
        <p className="font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Buat kode tamu
        </p>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nama tamu / kurir"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {(["guest", "courier"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                kind === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
              )}
            >
              {k === "guest" ? "Tamu" : "Kurir Kios"}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-border" />
          {DURATIONS.map((d) => (
            <button
              key={d.minutes}
              onClick={() => setMinutes(d.minutes)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                minutes === d.minutes ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <Button size="sm" disabled={busy || !label.trim()} onClick={create}>
          Buat kode
        </Button>
      </Card>

      {/* Passes */}
      {passes.length > 0 && (
        <Card className="p-4 space-y-3">
          <p className="font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Kode aktif
          </p>
          <ul className="space-y-2">
            {passes.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3",
                  p.active ? "border-border" : "border-border opacity-50"
                )}
              >
                <div>
                  <p className="text-sm font-medium">
                    {p.label} <span className="text-xs text-muted">· {p.kind === "courier" ? "Kurir" : "Tamu"}</span>
                  </p>
                  <p className="font-mono text-2xl font-bold tracking-widest">{p.pin}</p>
                  <p className="text-xs text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    s/d {new Date(p.validUntil).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {p.uses > 0 && ` · dipakai ${p.uses}×`}
                    {!p.active && " · nonaktif"}
                  </p>
                </div>
                {p.active && (
                  <button onClick={() => revoke(p.id)} className="text-muted hover:text-danger" title="Cabut">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Door panel */}
      <Card className="p-4 space-y-3">
        <p className="font-semibold">Panel pintu (simulasi)</p>
        <p className="text-xs text-muted">Masukkan PIN/kode tamu untuk membuka kunci.</p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PIN 6 digit"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono tracking-widest"
          />
          <Button size="sm" variant="outline" onClick={verify} disabled={!code.trim()}>
            Verifikasi
          </Button>
        </div>
      </Card>

      {/* Logs */}
      {logs.length > 0 && (
        <Card className="p-4">
          <p className="font-semibold mb-2">Riwayat akses</p>
          <ul className="divide-y divide-border text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  {l.action === "denied" ? (
                    <ShieldX className="h-4 w-4 text-danger" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-success" />
                  )}
                  {l.actorLabel}
                  <span className="text-xs text-muted">
                    {l.action === "resident_unlock" ? "buka sendiri" : l.action === "granted" ? "diizinkan" : `ditolak${l.reason ? ` (${l.reason})` : ""}`}
                  </span>
                </span>
                <span className="text-xs text-muted">
                  {new Date(l.occurredAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

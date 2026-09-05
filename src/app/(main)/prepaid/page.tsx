"use client";

import { useEffect, useState } from "react";
import { usePrepaid } from "@/hooks/usePrepaid";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import { Wallet, Zap, Droplets, PlugZap, PowerOff, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const TOPUP_PRESETS = [20000, 50000, 100000, 200000];

export default function PrepaidPage() {
  const { status, loading, refresh, topup, setConfig } = usePrepaid();
  const [busy, setBusy] = useState(false);

  // Poll so an auto-disconnect / debit shows up while the demo runs.
  useEffect(() => {
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const enabled = status?.enabled ?? false;
  const balance = status?.balanceIdr ?? 0;
  const disconnected = status?.disconnected ?? false;

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Prabayar Utilitas</h1>
        <p className="text-sm text-muted">
          Isi saldo, pakai listrik &amp; air seperti token PLN. Saldo habis → otomatis
          diputus; isi ulang → nyambung lagi.
        </p>
      </div>

      {/* Opt-in toggle */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Mode Prabayar</p>
            <p className="text-xs text-muted">
              {enabled ? "Aktif — pemakaian memotong saldo." : "Nonaktif — unit ditagih pascabayar."}
            </p>
          </div>
        </div>
        <Button
          variant={enabled ? "outline" : "primary"}
          size="sm"
          disabled={busy || loading}
          onClick={() => act(() => setConfig({ enabled: !enabled }))}
        >
          {enabled ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </Card>

      {enabled && (
        <>
          {/* Balance */}
          <Card
            className={cn(
              "p-5",
              disconnected ? "border-danger/40 bg-danger/5" : "border-primary/30 bg-primary/5"
            )}
          >
            <p className="text-xs text-muted">Sisa saldo</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(balance)}</p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              {disconnected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-danger">
                  <PowerOff className="h-3.5 w-3.5" /> Utilitas terputus
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-success">
                  <PlugZap className="h-3.5 w-3.5" /> Tersambung
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-muted">
                <Zap className="h-3.5 w-3.5" /> listrik
              </span>
              <span className="inline-flex items-center gap-1 text-muted">
                <Droplets className="h-3.5 w-3.5" /> air
              </span>
            </div>
          </Card>

          {/* Top-up */}
          <Card className="p-4">
            <p className="font-semibold mb-3">Isi ulang (QRIS simulasi)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TOPUP_PRESETS.map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => act(() => topup(amt))}
                >
                  {formatCurrency(amt)}
                </Button>
              ))}
            </div>
          </Card>

          {/* History */}
          <Card className="p-4">
            <p className="font-semibold mb-3">Riwayat</p>
            {status && status.transactions.length > 0 ? (
              <ul className="divide-y divide-border">
                {status.transactions.map((t) => {
                  const credit = t.amountIdr >= 0;
                  return (
                    <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="flex items-center gap-2">
                        {credit ? (
                          <ArrowUpCircle className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-muted" />
                        )}
                        <span>{t.description}</span>
                      </span>
                      <span className={cn("font-medium", credit ? "text-success" : "text-foreground")}>
                        {credit ? "+" : "−"}
                        {formatCurrency(Math.abs(t.amountIdr))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Belum ada transaksi.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

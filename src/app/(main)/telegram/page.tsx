"use client";

import { useCallback, useEffect, useState } from "react";
import { telegramService, type TelegramStatus, type TelegramLinkInfo } from "@/services/telegram.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Send, CheckCircle2, Link2, Unlink } from "lucide-react";

export default function TelegramPage() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [link, setLink] = useState<TelegramLinkInfo | null>(null);
  const [chatId, setChatId] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await telegramService.getStatus();
    if (res.success && res.data) setStatus(res.data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connect() {
    setBusy(true);
    try {
      const res = await telegramService.startLink();
      if (res.success && res.data) setLink(res.data);
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await telegramService.unlink();
      setLink(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function bind() {
    if (!chatId.trim()) return;
    setBusy(true);
    try {
      await telegramService.bind(chatId.trim());
      setChatId("");
      setLink(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const linked = status?.linked ?? false;

  return (
    <div className="space-y-5 max-w-xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Notifikasi Telegram</h1>
        <p className="text-sm text-muted">
          Terima alert penting (saldo prabayar habis, tagihan, bocor, paket, akses) langsung di Telegram.
        </p>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-xl p-2", linked ? "bg-success/10 text-success" : "bg-muted/10 text-muted")}>
            {linked ? <CheckCircle2 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold">{linked ? "Terhubung" : "Belum terhubung"}</p>
            <p className="text-xs text-muted">
              {status?.botConfigured
                ? status.botUsername
                  ? `Bot: @${status.botUsername}`
                  : "Bot aktif"
                : "Bot belum dikonfigurasi di server (TELEGRAM_BOT_TOKEN)."}
            </p>
          </div>
        </div>
        {linked ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={unlink}>
            <Unlink className="h-4 w-4" /> Putuskan
          </Button>
        ) : (
          <Button size="sm" disabled={busy} onClick={connect}>
            <Link2 className="h-4 w-4" /> Hubungkan
          </Button>
        )}
      </Card>

      {/* Link instructions */}
      {!linked && link && (
        <Card className="p-4 space-y-3">
          <p className="font-semibold">Langkah menghubungkan</p>
          {link.deepLink ? (
            <a href={link.deepLink} target="_blank" rel="noreferrer">
              <Button size="sm" className="w-full">
                <Send className="h-4 w-4" /> Buka bot &amp; kirim /start
              </Button>
            </a>
          ) : (
            <p className="text-sm text-muted">
              Buka bot Telegram gedung lalu kirim:
              <br />
              <code className="mt-1 inline-block rounded bg-surface-2 px-2 py-1 font-mono">
                /start {link.linkCode}
              </code>
            </p>
          )}
          <p className="text-xs text-muted">Setelah mengirim /start, halaman ini akan menampilkan “Terhubung”.</p>

          {/* Dev/demo fallback without a live bot */}
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted mb-2">
              Demo tanpa bot live: tempel <span className="font-mono">chat id</span> Telegram-mu.
            </p>
            <div className="flex gap-2">
              <input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="chat id (mis. 123456789)"
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
              <Button size="sm" variant="outline" disabled={busy || !chatId.trim()} onClick={bind}>
                Hubungkan
              </Button>
            </div>
          </div>
        </Card>
      )}

      {linked && (
        <p className="text-sm text-muted">
          Notifikasi akan dikirim ke Telegram-mu. Putuskan kapan saja lewat tombol di atas.
        </p>
      )}
    </div>
  );
}

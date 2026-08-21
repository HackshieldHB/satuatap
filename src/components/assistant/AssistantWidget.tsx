"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { interpret, ASSISTANT_SUGGESTIONS } from "@/lib/assistant";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

type SpeechResultLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "intro",
      role: "assistant",
      text: "Halo 👋 Aku asisten SATU ATAP. Minta aku nyalakan/matikan perangkat, jalankan skenario, atau tanya soal energi & tagihan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setVoiceSupported(!!getRecognitionCtor());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", text: trimmed },
    ]);
    setInput("");
    setThinking(true);
    const reply = await interpret(trimmed);
    setThinking(false);
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "assistant", text: reply },
    ]);
  };

  const toggleVoice = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) send(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed z-50 right-4 bottom-20 lg:bottom-6 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-primary to-secondary text-white shadow-floating",
          "transition-transform hover:scale-105 active:scale-95"
        )}
        aria-label="Buka asisten SATU ATAP"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>

      {open && (
        <div
          className="fixed z-50 right-4 bottom-36 lg:bottom-24 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-floating animate-slide-up"
          style={{ height: "min(70vh, 520px)" }}
          role="dialog"
          aria-label="Asisten SATU ATAP"
        >
          <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                Tanya SATU ATAP
              </p>
              <p className="text-[11px] text-muted">Asisten rumah pintar</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-background text-foreground"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-background px-3 py-2.5">
                  {[0, 0.15, 0.3].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
                      style={{ animationDelay: `${d}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide px-3 pb-2">
              {ASSISTANT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-border p-3">
            {voiceSupported && (
              <button
                onClick={toggleVoice}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                  listening
                    ? "animate-pulse bg-error text-white"
                    : "bg-background text-muted hover:text-foreground"
                )}
                aria-label="Input suara"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send(input);
              }}
              placeholder={listening ? "Mendengarkan..." : "Ketik perintah..."}
              className="flex-1 rounded-full bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || thinking}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="Kirim"
            >
              {thinking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/useToast";

const EVENTS: { message: string; type: "info" | "success" | "warning" }[] = [
  { message: "Sensor gerak terdeteksi di Dapur 👀", type: "info" },
  { message: "Lampu Teras otomatis menyala (matahari terbenam) 🌇", type: "info" },
  { message: "Pemakaian listrik turun 6% jam ini ⚡", type: "success" },
  { message: "Kelembapan Kamar Tidur naik ke 72% 💧", type: "info" },
  { message: "Pengingat: tagihan listrik jatuh tempo 2 hari lagi 🧾", type: "warning" },
];

/**
 * Fires occasional ambient "smart home" events so the app feels live.
 * Purely cosmetic (mock) — no real device connection.
 */
export function LiveSimulation() {
  const { showToast } = useToast();
  const idx = useRef(Math.floor(Math.random() * EVENTS.length));

  useEffect(() => {
    const fire = () => {
      const e = EVENTS[idx.current % EVENTS.length];
      idx.current += 1;
      showToast(e.message, e.type);
    };
    const first = setTimeout(fire, 18000);
    const interval = setInterval(fire, 45000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [showToast]);

  return null;
}

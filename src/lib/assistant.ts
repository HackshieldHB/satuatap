import { MOCK_DEVICES, MOCK_BILLS, MOCK_DASHBOARD } from "@/data/mock";
import { formatCurrency } from "@/lib/utils";
import { deviceService } from "@/services/home.service";
import { automationService } from "@/services/automation.service";

const ROOMS = [
  "ruang tamu",
  "kamar tidur",
  "kamar mandi",
  "kamar",
  "dapur",
  "garasi",
  "teras",
];

const SCENE_KEYWORDS: { pattern: RegExp; id: string }[] = [
  { pattern: /mode pulang|pulang|selamat datang/, id: "scene-home" },
  { pattern: /mode tidur|tidur|malam/, id: "scene-sleep" },
  { pattern: /hemat energi|hemat|eco/, id: "scene-eco" },
  { pattern: /mode film|film|nonton|bioskop/, id: "scene-movie" },
];

export const ASSISTANT_SUGGESTIONS = [
  "Matikan lampu ruang tamu",
  "Mode Tidur",
  "Berapa tagihan listrik?",
  "Pemakaian energi hari ini",
];

/** Interpret a natural-language command against the mock home and act on it. */
export async function interpret(input: string): Promise<string> {
  const t = input.toLowerCase().trim();
  if (!t) {
    return 'Coba tanya, misalnya: "matikan lampu ruang tamu" atau "berapa tagihan listrik?"';
  }

  if (/^(halo|hai|hi|help|bantuan|bisa apa|apa yang bisa)/.test(t)) {
    return "Halo! Aku asisten SATU ATAP 🤖. Aku bisa menyalakan/mematikan perangkat, menjalankan skenario (Mode Tidur, Mode Pulang, Hemat Energi), dan memberi info energi, air, atau tagihan. Coba ketik atau ucapkan perintahmu.";
  }

  // Scene activation
  for (const { pattern, id } of SCENE_KEYWORDS) {
    if (pattern.test(t)) {
      const res = await automationService.activateScene(id);
      if (res.success && res.data) {
        return `Siap! ${res.data.name} aktif — ${res.data.updated} perangkat diperbarui. ✨`;
      }
    }
  }

  const turnOn = /nyalakan|hidupkan|aktifkan/.test(t);
  const turnOff = /matikan|padamkan|\bmati\b/.test(t);

  if ((turnOn || turnOff) && /semua/.test(t)) {
    let n = 0;
    for (const d of MOCK_DEVICES) {
      if (d.isOn !== undefined && d.isOn !== turnOn) {
        await deviceService.toggleDevice(d.id);
        n++;
      }
    }
    return `${turnOn ? "Menyalakan" : "Mematikan"} semua perangkat — ${n} perangkat diperbarui. 💡`;
  }

  if (turnOn || turnOff) {
    const controllable = MOCK_DEVICES.filter((d) => d.isOn !== undefined);
    let targets = controllable.filter((d) => t.includes(d.name.toLowerCase()));

    if (targets.length === 0) {
      const room = ROOMS.find((r) => t.includes(r));
      if (room) {
        targets = controllable.filter((d) =>
          d.room.toLowerCase().includes(room)
        );
      }
      if (/lampu/.test(t)) {
        const base = targets.length ? targets : controllable;
        targets = base.filter((d) => d.type === "light");
      }
    }
    if (targets.length === 0 && /lampu/.test(t)) {
      targets = controllable.filter((d) => d.type === "light");
    }

    if (targets.length === 0) {
      return "Aku belum menemukan perangkat itu. Sebutkan nama perangkat atau ruangannya ya. 🙂";
    }

    for (const d of targets) {
      if (d.isOn !== turnOn) {
        await deviceService.toggleDevice(d.id);
      }
    }
    const names = targets
      .slice(0, 3)
      .map((d) => d.name)
      .join(", ");
    const extra = targets.length > 3 ? ` +${targets.length - 3} lainnya` : "";
    return `${turnOn ? "Menyalakan" : "Mematikan"} ${names}${extra}. ✅`;
  }

  if (/tagihan|bayar|utilitas/.test(t)) {
    const unpaid = MOCK_BILLS.filter((b) => b.status === "unpaid");
    const total = unpaid.reduce((s, b) => s + b.amount, 0);
    return `Kamu punya ${unpaid.length} tagihan belum dibayar, total ${formatCurrency(
      total
    )}. Paling dekat jatuh tempo: ${unpaid[0]?.provider ?? "-"}. 🧾`;
  }

  if (/energi|listrik|kwh|pemakaian/.test(t)) {
    const e = MOCK_DASHBOARD.energy;
    const dir = e.comparisonDirection === "down" ? "lebih rendah" : "lebih tinggi";
    return `Pemakaian listrik hari ini ${e.todayKwh} kWh (estimasi ${formatCurrency(
      e.estimatedCost
    )}), ${e.comparisonPercent}% ${dir} dari kemarin. ⚡`;
  }

  if (/\bair\b|water/.test(t)) {
    const w = MOCK_DASHBOARD.water;
    return `Pemakaian air hari ini ${w.todayLiters} liter (estimasi ${formatCurrency(
      w.estimatedCost
    )}). 💧`;
  }

  if (/perangkat|device|online/.test(t)) {
    return `Ada ${MOCK_DASHBOARD.devicesOnline} perangkat online dan ${MOCK_DASHBOARD.devicesOffline} offline di rumahmu.`;
  }

  if (/suhu|temperatur|udara|kelembapan/.test(t)) {
    const env = MOCK_DASHBOARD.environment;
    return `Suhu rumah ${env.temperature}°C, kelembapan ${env.humidity}%. Kualitas udara baik. 🌤️`;
  }

  return 'Maaf, aku belum paham 😅. Coba: "matikan lampu", "Mode Tidur", atau "berapa tagihan listrik?"';
}

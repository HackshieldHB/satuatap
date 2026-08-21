"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Lightbulb,
  ToggleLeft,
  Thermometer,
  Droplets,
  Activity,
  Zap,
  Plug,
  Camera,
  Plus,
  Wifi,
  Bluetooth,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEVICE_CATEGORIES } from "@/data/mock";
import { useToast } from "@/hooks/useToast";
import type { DeviceProtocol } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  lightbulb: Lightbulb,
  "toggle-left": ToggleLeft,
  thermometer: Thermometer,
  droplets: Droplets,
  activity: Activity,
  zap: Zap,
  plug: Plug,
  camera: Camera,
  plus: Plus,
};

const protocols: { id: DeviceProtocol; label: string; icon: LucideIcon }[] = [
  { id: "wifi", label: "Wi-Fi", icon: Wifi },
  { id: "bluetooth", label: "Bluetooth", icon: Bluetooth },
  { id: "zigbee", label: "Zigbee", icon: Radio },
  { id: "matter", label: "Matter", icon: Radio },
  { id: "mqtt", label: "MQTT", icon: Radio },
];

export default function AddDevicePage() {
  const { showToast } = useToast();
  const [step, setStep] = useState<"category" | "protocol" | "custom">("category");
  const [, setSelectedCategory] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    setStep("protocol");
  };

  const handleProtocolSelect = () => {
    showToast("Perangkat berhasil ditambahkan (demo)", "success");
    setTimeout(() => {
      window.location.href = "/devices";
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div>
        <Link href="/devices" className="text-sm text-primary hover:underline">
          ← Kembali
        </Link>
        <h1 className="text-xl font-bold mt-2">Tambah Perangkat</h1>
        <p className="text-sm text-muted">Pilih jenis perangkat yang ingin ditambahkan.</p>
      </div>

      {step === "category" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DEVICE_CATEGORIES.map((cat) => {
              const Icon = iconMap[cat.icon] || Plus;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-surface p-4 hover:shadow-card transition-shadow text-center"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{cat.label}</p>
                  <p className="text-xs text-muted">{cat.description}</p>
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setStep("custom")}
          >
            <Plus className="h-4 w-4" />
            Tambah Perangkat Kustom
          </Button>
        </>
      )}

      {step === "protocol" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Pilih protokol koneksi untuk perangkatmu.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {protocols.map((proto) => {
              const Icon = proto.icon;
              return (
                <button
                  key={proto.id}
                  onClick={handleProtocolSelect}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-surface p-4 hover:border-primary/30 transition-colors"
                >
                  <Icon className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-medium">{proto.label}</span>
                </button>
              );
            })}
          </div>
          <Button variant="ghost" onClick={() => setStep("category")}>
            Kembali
          </Button>
        </div>
      )}

      {step === "custom" && (
        <Card className="space-y-4">
          <Input
            label="Nama Perangkat"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Contoh: Lampu Teras"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("category")}>
              Kembali
            </Button>
            <Button
              onClick={handleProtocolSelect}
              disabled={!customName.trim()}
            >
              Tambah Perangkat
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

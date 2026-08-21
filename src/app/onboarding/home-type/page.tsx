"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { HomeType } from "@/types";

const homeTypes: { id: HomeType; label: string; emoji: string }[] = [
  { id: "apartment", label: "Apartemen", emoji: "🏢" },
  { id: "house", label: "Rumah", emoji: "🏠" },
  { id: "villa", label: "Villa", emoji: "🏡" },
  { id: "other", label: "Lainnya", emoji: "🏘️" },
];

export default function HomeTypePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<HomeType | null>(null);

  const handleNext = () => {
    if (!selected) return;
    sessionStorage.setItem("huni_onboarding_home_type", selected);
    router.push("/onboarding/add-device");
  };

  return (
    <div className="w-full max-w-md space-y-6 animate-fade-in">
      <div className="text-center">
        <Logo size="md" className="items-center mx-auto" />
        <p className="text-xs text-muted mt-2">Langkah 2 dari 3</p>
      </div>

      <Card padding="lg" className="shadow-floating space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Pilih tipe rumah</h1>
          <p className="text-sm text-muted">Ini membantu SATU ATAP memberikan rekomendasi yang tepat.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {homeTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all touch-target",
                selected === type.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              )}
            >
              <span className="text-3xl" aria-hidden>{type.emoji}</span>
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            Kembali
          </Button>
          <Button className="flex-1" onClick={handleNext} disabled={!selected}>
            Lanjut
          </Button>
        </div>
      </Card>
    </div>
  );
}

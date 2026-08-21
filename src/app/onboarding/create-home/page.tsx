"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function CreateHomePage() {
  const router = useRouter();
  const [homeName, setHomeName] = useState("");

  const handleNext = () => {
    if (!homeName.trim()) return;
    sessionStorage.setItem("huni_onboarding_home_name", homeName.trim());
    router.push("/onboarding/home-type");
  };

  return (
    <div className="w-full max-w-md space-y-6 animate-fade-in">
      <div className="text-center">
        <Logo size="md" className="items-center mx-auto" />
        <p className="text-xs text-muted mt-2">Langkah 1 dari 3</p>
      </div>

      <Card padding="lg" className="shadow-floating space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Apa nama rumahmu?</h1>
          <p className="text-sm text-muted">
            Beri nama yang mudah dikenali oleh keluargamu.
          </p>
        </div>

        <Input
          label="Nama Rumah"
          value={homeName}
          onChange={(e) => setHomeName(e.target.value)}
          placeholder="Contoh: Rumah Kevin"
          autoFocus
        />

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            Kembali
          </Button>
          <Button className="flex-1" onClick={handleNext} disabled={!homeName.trim()}>
            Lanjut
          </Button>
        </div>
      </Card>
    </div>
  );
}

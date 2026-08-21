"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Plus, Cpu } from "lucide-react";

export default function AddFirstDevicePage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const completeOnboarding = async (skippedDevice: boolean) => {
    setIsLoading(true);
    const homeName =
      sessionStorage.getItem("huni_onboarding_home_name") || "Rumah Saya";
    const homeType =
      (sessionStorage.getItem("huni_onboarding_home_type") as "house") || "house";

    await authService.completeOnboarding({
      homeName,
      homeType,
      skippedDevice,
    });

    sessionStorage.removeItem("huni_onboarding_home_name");
    sessionStorage.removeItem("huni_onboarding_home_type");
    refreshSession();
    setIsLoading(false);

    if (skippedDevice) {
      router.push("/");
    } else {
      router.push("/devices/add");
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 animate-fade-in">
      <div className="text-center">
        <Logo size="md" className="items-center mx-auto" />
        <p className="text-xs text-muted mt-2">Langkah 3 dari 3</p>
      </div>

      <Card padding="lg" className="shadow-floating space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
            <Cpu className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Tambah perangkat pertama</h1>
          <p className="text-sm text-muted">
            Hubungkan perangkat pintar pertamamu atau lewati dulu.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full gap-2"
            onClick={() => completeOnboarding(false)}
            isLoading={isLoading}
          >
            <Plus className="h-4 w-4" />
            Tambah Perangkat
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => completeOnboarding(true)}
            disabled={isLoading}
          >
            Lewati Dulu
          </Button>
        </div>
      </Card>
    </div>
  );
}

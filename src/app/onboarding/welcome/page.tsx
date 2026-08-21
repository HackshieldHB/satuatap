"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function OnboardingWelcomePage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
      <Logo size="lg" className="items-center mx-auto" />

      <Card padding="lg" className="shadow-floating space-y-6">
        <div className="text-5xl" aria-hidden>👋</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Selamat datang di SATU ATAP</h1>
          <p className="text-sm text-muted">
            Yuk, atur rumah pintarmu. Hanya butuh beberapa langkah.
          </p>
        </div>
        <Button className="w-full" onClick={() => router.push("/onboarding/create-home")}>
          Mulai Setup
        </Button>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-muted hover:text-primary"
        >
          Lewati untuk sekarang
        </button>
      </Card>
    </div>
  );
}

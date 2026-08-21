"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where errors would be reported to an
    // observability service (Sentry, etc.).
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10">
        <AlertTriangle className="h-8 w-8 text-error" aria-hidden />
      </div>
      <h1 className="mt-4 text-lg font-bold">Terjadi kesalahan</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Maaf, ada yang tidak beres saat memuat halaman ini. Coba lagi sebentar.
      </p>
      <Button className="mt-6" onClick={reset}>
        Coba Lagi
      </Button>
    </div>
  );
}

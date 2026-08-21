import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Terjadi kesalahan",
  message = "Tidak dapat memuat data. Periksa koneksi internet kamu.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
      role="alert"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-error/10">
        <AlertCircle className="h-8 w-8 text-error" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-6 gap-2">
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </Button>
      )}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-warning text-white px-4 py-2 text-center text-sm font-medium"
      role="alert"
    >
      Kamu sedang offline. Beberapa fitur mungkin tidak tersedia.
    </div>
  );
}

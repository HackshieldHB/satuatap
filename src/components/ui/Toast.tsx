"use client";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: "bg-success text-white",
  error: "bg-error text-white",
  info: "bg-info text-white",
  warning: "bg-warning text-white",
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 lg:bottom-6 right-4 left-4 lg:left-auto lg:w-96 z-[60] flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 rounded-md px-4 py-3 shadow-floating animate-slide-up",
              styles[toast.type]
            )}
            role="alert"
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-80 hover:opacity-100"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

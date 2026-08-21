import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

interface AlertProps {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const config = {
  info: {
    icon: Info,
    bg: "bg-info/10 border-info/20 text-info",
    iconColor: "text-info",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-success/10 border-success/20 text-success",
    iconColor: "text-success",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-warning/10 border-warning/20 text-warning",
    iconColor: "text-warning",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-error/10 border-error/20 text-error",
    iconColor: "text-error",
  },
};

export function Alert({
  variant = "info",
  title,
  message,
  onDismiss,
  className,
}: AlertProps) {
  const { icon: Icon, bg, iconColor } = config[variant];

  return (
    <div
      className={cn("flex gap-3 rounded-md border p-4", bg, className)}
      role="alert"
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColor)} aria-hidden />
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-sm font-semibold text-foreground">{title}</p>
        )}
        <p className="text-sm text-muted">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-muted hover:text-foreground touch-target flex items-center justify-center"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

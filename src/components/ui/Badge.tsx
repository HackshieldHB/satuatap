import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "secondary";
  className?: string;
}

const variants = {
  default: "bg-background text-muted border border-border",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
  secondary: "bg-secondary/10 text-secondary",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: "online" | "offline" | "unknown";
  className?: string;
}) {
  const config = {
    online: { label: "Online", variant: "success" as const, dot: "bg-success" },
    offline: { label: "Offline", variant: "error" as const, dot: "bg-error" },
    unknown: { label: "Tidak diketahui", variant: "default" as const, dot: "bg-muted" },
  }[status];

  return (
    <Badge variant={config.variant} className={className}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} aria-hidden />
      {config.label}
    </Badge>
  );
}

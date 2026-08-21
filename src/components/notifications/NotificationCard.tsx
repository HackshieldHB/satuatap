import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  Zap,
  Droplets,
  WifiOff,
  CreditCard,
  Gift,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { Notification } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  droplets: Droplets,
  "wifi-off": WifiOff,
  "credit-card": CreditCard,
  gift: Gift,
};

interface NotificationCardProps {
  notification: Notification;
  onMarkRead?: (id: string) => void;
}

export function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const Icon = notification.icon ? iconMap[notification.icon] || Bell : Bell;
  const isPromo = notification.category === "promotion";

  return (
    <Card
      className={cn(
        "flex gap-3 cursor-pointer transition-colors",
        !notification.read && "border-primary/20 bg-primary/5",
        isPromo && "border-accent/30 bg-accent/5"
      )}
      padding="md"
      onClick={() => onMarkRead?.(notification.id)}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
          isPromo ? "bg-accent/20" : "bg-background"
        )}
      >
        <Icon className={cn("h-5 w-5", isPromo ? "text-accent-foreground" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium", !notification.read && "font-semibold")}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary mt-1.5" aria-label="Belum dibaca" />
          )}
        </div>
        <p className="text-xs text-muted mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-[10px] text-muted mt-1">
          {new Date(notification.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </Card>
  );
}

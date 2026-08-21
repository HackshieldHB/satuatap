"use client";

import { NotificationCard } from "@/components/notifications/NotificationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { useNotifications } from "@/hooks/useNotifications";
import { BellOff, CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const { showToast } = useToast();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    markAllRead();
    showToast("Semua notifikasi ditandai dibaca.", "success");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Notifikasi</h1>
          <p className="text-sm text-muted">
            {unreadCount > 0
              ? `${unreadCount} belum dibaca`
              : "Semua sudah dibaca"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={handleMarkAll}
          >
            <CheckCheck className="h-4 w-4" />
            Tandai semua
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Belum ada notifikasi"
          description="Notifikasi tentang rumahmu akan muncul di sini."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onMarkRead={markRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}

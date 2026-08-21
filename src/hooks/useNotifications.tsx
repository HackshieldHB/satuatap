"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Notification, NotificationCategory } from "@/types";
import { MOCK_NOTIFICATIONS } from "@/data/mock";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: {
    category: NotificationCategory;
    title: string;
    message: string;
    icon?: string;
  }) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Clone so we never mutate the shared mock array.
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    MOCK_NOTIFICATIONS.map((n) => ({ ...n }))
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback<NotificationContextValue["addNotification"]>(
    (n) => {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          read: false,
          createdAt: new Date().toISOString(),
          ...n,
        },
        ...prev,
      ]);
    },
    []
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, addNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

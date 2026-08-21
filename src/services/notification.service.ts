import type { Notification, ApiResponse } from "@/types";
import { MOCK_NOTIFICATIONS } from "@/data/mock";
import { delay } from "@/lib/utils";

export class NotificationService {
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    await delay(400);
    return { success: true, data: MOCK_NOTIFICATIONS };
  }

  async markAsRead(id: string): Promise<ApiResponse<{ read: true }>> {
    await delay(200);
    const notif = MOCK_NOTIFICATIONS.find((n) => n.id === id);
    if (notif) notif.read = true;
    return { success: true, data: { read: true } };
  }
}

export const notificationService = new NotificationService();

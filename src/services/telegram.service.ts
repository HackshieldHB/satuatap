import { apiFetch } from "@/services/http";

export interface TelegramStatus {
  linked: boolean;
  username: string | null;
  botConfigured: boolean;
  botUsername: string | null;
}

export interface TelegramLinkInfo {
  linkCode: string;
  botUsername: string | null;
  deepLink: string | null;
  botConfigured: boolean;
}

/** Connect a user's Telegram chat to receive push notifications. */
export const telegramService = {
  getStatus() {
    return apiFetch<TelegramStatus>(`/v1/telegram/status`);
  },
  startLink() {
    return apiFetch<TelegramLinkInfo>(`/v1/telegram/link`, { method: "POST" });
  },
  unlink() {
    return apiFetch<{ ok: boolean }>(`/v1/telegram/unlink`, { method: "POST" });
  },
  bind(chatId: string) {
    return apiFetch<{ ok: boolean }>(`/v1/telegram/bind`, {
      method: "POST",
      body: JSON.stringify({ chatId }),
    });
  },
};

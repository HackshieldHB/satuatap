import { randomBytes } from "node:crypto";
import { prisma } from "@satu-atap/db";
import { config } from "./config.js";

export function hasBot(): boolean {
  return config.telegramBotToken.length > 0;
}

function code(): string {
  return randomBytes(6).toString("base64url");
}

/** Low-level Bot API sendMessage. No-op (logged) when no token is configured. */
export async function sendToChat(chatId: string, text: string): Promise<void> {
  if (!hasBot()) {
    console.log(JSON.stringify({ msg: "telegram_skip_no_token", chatId, text }));
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) {
    console.log(JSON.stringify({ msg: "telegram_send_error", error: e instanceof Error ? e.message : "unknown" }));
  }
}

/** Begin linking: mint a code and return the t.me deep link to open the bot. */
export async function startLink(userId: string) {
  const linkCode = code();
  await prisma.telegramLink.upsert({
    where: { userId },
    update: { linkCode, linked: false, chatId: null },
    create: { userId, linkCode },
  });
  const username = config.telegramBotUsername;
  return {
    linkCode,
    botUsername: username || null,
    deepLink: username ? `https://t.me/${username}?start=${linkCode}` : null,
    botConfigured: hasBot(),
  };
}

export async function getStatus(userId: string) {
  const link = await prisma.telegramLink.findUnique({ where: { userId } });
  return {
    linked: link?.linked ?? false,
    username: link?.username ?? null,
    botConfigured: hasBot(),
    botUsername: config.telegramBotUsername || null,
  };
}

export async function unlink(userId: string) {
  await prisma.telegramLink.deleteMany({ where: { userId } });
  return { ok: true };
}

/** Directly bind a chat id for the current user (demo/testing without a live bot). */
export async function bindDev(userId: string, chatId: string) {
  const existing = await prisma.telegramLink.findUnique({ where: { userId } });
  await prisma.telegramLink.upsert({
    where: { userId },
    update: { chatId, linked: true },
    create: { userId, chatId, linked: true, linkCode: existing?.linkCode ?? code() },
  });
  return { ok: true };
}

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string; username?: string };
    from?: { username?: string };
  };
};

/** Handle a Telegram webhook update: binds chatId on `/start <linkCode>`. */
export async function handleWebhookUpdate(update: TelegramUpdate): Promise<{ ok: boolean }> {
  const text = update.message?.text ?? "";
  const chatId = update.message?.chat?.id;
  if (!text.startsWith("/start") || chatId == null) return { ok: true };
  const parts = text.trim().split(/\s+/);
  const linkCode = parts[1];
  if (!linkCode) return { ok: true };
  const link = await prisma.telegramLink.findUnique({ where: { linkCode } });
  if (!link) {
    await sendToChat(String(chatId), "Kode tidak dikenal. Buka lagi tautan dari aplikasi Satu Atap.");
    return { ok: true };
  }
  await prisma.telegramLink.update({
    where: { userId: link.userId },
    data: { chatId: String(chatId), username: update.message?.from?.username ?? null, linked: true },
  });
  await sendToChat(String(chatId), "✅ <b>Terhubung ke Satu Atap.</b> Kamu akan menerima notifikasi penting di sini.");
  return { ok: true };
}

/** Push a notification to every linked member of a unit. */
export async function notifyHomeTelegram(homeId: string, msg: { title: string; body: string }): Promise<void> {
  const members = await prisma.membership.findMany({ where: { homeId }, select: { userId: true } });
  if (members.length === 0) return;
  const links = await prisma.telegramLink.findMany({
    where: { userId: { in: members.map((m) => m.userId) }, linked: true, chatId: { not: null } },
  });
  const text = `<b>${msg.title}</b>\n${msg.body}`;
  for (const l of links) {
    if (l.chatId) await sendToChat(l.chatId, text);
  }
}

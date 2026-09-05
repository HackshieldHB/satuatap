import { hub } from "./events.js";
import { notifyHomeTelegram } from "./telegram.js";

export type NotifyMessage = {
  title: string;
  body: string;
  tag?: string;
};

/**
 * Deliver a notification to a unit's members: fan out over SSE for the web app
 * to toast in real time, and push to Telegram for members who linked their chat.
 * Telegram delivery is fire-and-forget so it never blocks or breaks the caller
 * (e.g. the ingest path).
 */
export async function notify(homeId: string, msg: NotifyMessage): Promise<void> {
  hub.publish({
    event: "notification",
    homeId,
    data: { title: msg.title, body: msg.body, tag: msg.tag ?? "info" },
    ts: new Date().toISOString(),
  });
  console.log(JSON.stringify({ msg: "notify", homeId, title: msg.title, tag: msg.tag }));
  void notifyHomeTelegram(homeId, msg).catch(() => {});
}

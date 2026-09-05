import { hub } from "./events.js";

export type NotifyMessage = {
  title: string;
  body: string;
  tag?: string;
};

/**
 * Deliver a notification to a unit's members. Currently fans out over SSE so the
 * web app can toast it in real time. Phase F extends this to also push to
 * Telegram for members who linked their chat.
 */
export async function notify(homeId: string, msg: NotifyMessage): Promise<void> {
  hub.publish({
    event: "notification",
    homeId,
    data: { title: msg.title, body: msg.body, tag: msg.tag ?? "info" },
    ts: new Date().toISOString(),
  });
  console.log(JSON.stringify({ msg: "notify", homeId, title: msg.title, tag: msg.tag }));
}

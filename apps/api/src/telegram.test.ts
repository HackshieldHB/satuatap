import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import { startLink, getStatus, handleWebhookUpdate, bindDev, unlink, notifyHomeTelegram } from "./telegram.js";

const USER = "user-1";

describe("telegram", () => {
  afterAll(async () => {
    await prisma.telegramLink.deleteMany({ where: { userId: USER } });
  });

  it("mints a link code and stays unlinked until bound", async () => {
    const info = await startLink(USER);
    expect(info.linkCode.length).toBeGreaterThan(0);
    const status = await getStatus(USER);
    expect(status.linked).toBe(false);
  });

  it("binds a chat via the webhook /start payload", async () => {
    const info = await startLink(USER);
    const res = await handleWebhookUpdate({
      message: { text: `/start ${info.linkCode}`, chat: { id: 987654321 }, from: { username: "kevin" } },
    });
    expect(res.ok).toBe(true);
    const status = await getStatus(USER);
    expect(status.linked).toBe(true);
  });

  it("dev-binds and delivers without throwing when no token is set", async () => {
    await bindDev(USER, "111222333");
    // No TELEGRAM_BOT_TOKEN in test env → send is a logged no-op, must not throw.
    await expect(notifyHomeTelegram("home-1", { title: "Tes", body: "Halo" })).resolves.toBeUndefined();
    await unlink(USER);
    expect((await getStatus(USER)).linked).toBe(false);
  });
});

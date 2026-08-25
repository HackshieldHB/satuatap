import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "@satu-atap/db";

async function expireCommands() {
  const now = new Date();
  await prisma.command.updateMany({
    where: {
      status: { in: ["PENDING", "SENT", "ACKNOWLEDGED"] },
      expiresAt: { lt: now },
    },
    data: { status: "TIMEOUT" },
  });
}

const app = await buildApp();
setInterval(() => {
  expireCommands().catch(() => undefined);
}, 15_000);

await app.listen({ port: config.port, host: "0.0.0.0" });
app.log.info({ msg: "API listening", port: config.port });

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "@satu-atap/db";
import { config } from "./config.js";
import { registerRoutes } from "./routes.js";
import { rollupNow } from "./rollup.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: "info",
      redact: ["req.headers.authorization", "password", "token", "deviceSecret"],
    },
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(jwt, { secret: config.jwtSecret });
  await app.register(rateLimit, {
    global: true,
    timeWindow: "1 minute",
    max: (req) => {
      const path = req.url.split("?")[0];
      if (path.startsWith("/v1/auth/")) return 10;
      if (path.startsWith("/internal/")) return 5000;
      if (path.startsWith("/v1/")) return 300;
      return 10_000;
    },
    keyGenerator: (req) => {
      const path = req.url.split("?")[0];
      if (path.startsWith("/internal/")) {
        const key = req.headers["x-internal-key"];
        return `internal:${typeof key === "string" ? key : req.ip}`;
      }
      if (path.startsWith("/v1/auth/")) {
        return `auth:${req.ip}`;
      }
      if (path.startsWith("/v1/")) {
        const auth = req.headers.authorization;
        return typeof auth === "string" && auth.length > 0 ? `user:${auth}` : `ip:${req.ip}`;
      }
      return `other:${req.ip}`;
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      success: false,
      error: "Too many requests",
    }),
  });

  app.addHook("onRequest", async (req) => {
    req.log.info({ msg: "API request", method: req.method, url: req.url });
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err, msg: "API error" });
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message =
      status >= 500
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : "Request failed";
    reply.code(status).send({ success: false, error: message });
  });

  await registerRoutes(app);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}

export function startScheduledJobs() {
  const tick = () => {
    rollupNow().catch((err) => {
      console.error(JSON.stringify({ msg: "Rollup failed", error: String(err) }));
    });
  };
  tick();
  return setInterval(tick, 60 * 60 * 1000);
}

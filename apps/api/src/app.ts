import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "@satu-atap/db";
import { config } from "./config.js";
import { registerRoutes } from "./routes.js";

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
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

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

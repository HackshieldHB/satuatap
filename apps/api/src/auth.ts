import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma, type MembershipRole, type Prisma } from "@satu-atap/db";
import { config } from "./config.js";

export type AuthUser = {
  sub: string;
  email: string;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, error: "Unauthorized" });
  }
}

export function requireInternalKey(req: FastifyRequest, reply: FastifyReply) {
  const key = req.headers["x-internal-key"];
  if (key !== config.internalApiKey) {
    return reply.code(401).send({ success: false, error: "Unauthorized" });
  }
}

export async function requireHomeRole(
  userId: string,
  homeId: string,
  minRole: MembershipRole = "VIEWER"
): Promise<MembershipRole | null> {
  const m = await prisma.membership.findUnique({
    where: { userId_homeId: { userId, homeId } },
  });
  if (!m) return null;
  const rank = { VIEWER: 1, USER: 2, ADMIN: 3 };
  if (rank[m.role] < rank[minRole]) return null;
  return m.role;
}

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });
}

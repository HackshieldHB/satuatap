import { randomUUID } from "node:crypto";
import { prisma } from "@satu-atap/db";
import { createCommand } from "./automation.js";
import { notify } from "./notify.js";

/** The unit's / lobby's solenoid lock — a relay actuator whose id starts "lock". */
async function findLockDevice(homeId: string) {
  return prisma.device.findFirst({
    where: { homeId, id: { startsWith: "lock" }, capabilities: { some: { capability: "on_off" } } },
  });
}

function genPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function mapPass(p: {
  id: string; label: string; kind: string; pin: string; token: string;
  validFrom: Date; validUntil: Date; maxUses: number; uses: number; revoked: boolean; createdAt: Date;
}) {
  const now = Date.now();
  const active = !p.revoked && p.validUntil.getTime() > now &&
    (p.maxUses === 0 || p.uses < p.maxUses);
  return {
    id: p.id,
    label: p.label,
    kind: p.kind,
    pin: p.pin,
    token: p.token,
    validFrom: p.validFrom.toISOString(),
    validUntil: p.validUntil.toISOString(),
    maxUses: p.maxUses,
    uses: p.uses,
    revoked: p.revoked,
    active,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function createPass(input: {
  homeId: string;
  createdById?: string | null;
  label: string;
  kind?: string;
  validMinutes: number;
  maxUses?: number;
}) {
  const validUntil = new Date(Date.now() + input.validMinutes * 60_000);
  const pass = await prisma.accessPass.create({
    data: {
      homeId: input.homeId,
      createdById: input.createdById ?? null,
      label: input.label,
      kind: input.kind ?? "guest",
      pin: genPin(),
      token: randomUUID(),
      validUntil,
      maxUses: input.maxUses ?? 0,
    },
  });
  return mapPass(pass);
}

export async function revokePass(homeId: string, id: string) {
  const pass = await prisma.accessPass.findFirst({ where: { id, homeId } });
  if (!pass) throw Object.assign(new Error("Pass not found"), { statusCode: 404 });
  const updated = await prisma.accessPass.update({ where: { id }, data: { revoked: true } });
  return mapPass(updated);
}

export async function listPasses(homeId: string) {
  const rows = await prisma.accessPass.findMany({
    where: { homeId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(mapPass);
}

export async function listLogs(homeId: string) {
  const rows = await prisma.accessLog.findMany({
    where: { homeId },
    orderBy: { occurredAt: "desc" },
    take: 50,
  });
  return rows.map((l) => ({
    id: l.id,
    passId: l.passId,
    action: l.action,
    actorLabel: l.actorLabel,
    reason: l.reason,
    occurredAt: l.occurredAt.toISOString(),
  }));
}

/** Drive the lock open (momentary TURN_ON) and write an access log entry. */
async function openLock(input: {
  homeId: string; actorLabel: string; action: string; passId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const lock = await findLockDevice(input.homeId);
  if (!lock) {
    await prisma.accessLog.create({
      data: { homeId: input.homeId, passId: input.passId ?? null, action: "denied", actorLabel: input.actorLabel, reason: "no_lock_device" },
    });
    return { ok: false, error: "Perangkat kunci tidak ditemukan di unit ini." };
  }
  await createCommand({
    homeId: input.homeId,
    deviceId: lock.id,
    type: "TURN_ON",
    params: { momentary: true },
    idempotencyKey: `access:unlock:${lock.id}:${Date.now()}`,
  });
  await prisma.accessLog.create({
    data: { homeId: input.homeId, passId: input.passId ?? null, deviceId: lock.id, action: input.action, actorLabel: input.actorLabel },
  });
  return { ok: true };
}

/** Resident opens their own door directly from the app. */
export async function residentUnlock(homeId: string, actorLabel: string) {
  return openLock({ homeId, actorLabel, action: "resident_unlock" });
}

/** Verify a PIN or QR token at a door panel and open the lock if valid. */
export async function verifyAndUnlock(homeId: string, code: string) {
  const pass = await prisma.accessPass.findFirst({
    where: { homeId, OR: [{ pin: code }, { token: code }] },
  });
  const now = Date.now();
  const valid =
    pass &&
    !pass.revoked &&
    pass.validUntil.getTime() > now &&
    pass.validFrom.getTime() <= now &&
    (pass.maxUses === 0 || pass.uses < pass.maxUses);

  if (!pass || !valid) {
    await prisma.accessLog.create({
      data: { homeId, passId: pass?.id ?? null, action: "denied", actorLabel: pass?.label ?? "Tidak dikenal", reason: pass ? "expired_or_used" : "invalid_code" },
    });
    return { granted: false as const };
  }

  await prisma.accessPass.update({ where: { id: pass.id }, data: { uses: { increment: 1 } } });
  const res = await openLock({ homeId, actorLabel: pass.label, action: "granted", passId: pass.id });
  if (!res.ok) return { granted: false as const, error: res.error };
  await notify(homeId, {
    title: "Pintu dibuka",
    body: `${pass.label} membuka pintu.`,
    tag: "access.granted",
  });
  return { granted: true as const, label: pass.label, kind: pass.kind };
}

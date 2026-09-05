import { randomUUID } from "node:crypto";
import { prisma, type TicketStatus } from "@satu-atap/db";
import { notify } from "./notify.js";

// ─── Announcements ───────────────────────────────────────────────────────────

export async function listAnnouncements(buildingId: string) {
  const rows = await prisma.announcement.findMany({
    where: { buildingId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    category: a.category,
    pinned: a.pinned,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function createAnnouncement(
  buildingId: string,
  createdById: string | null,
  input: { title: string; body: string; category?: string; pinned?: boolean }
) {
  const a = await prisma.announcement.create({
    data: {
      buildingId,
      createdById,
      title: input.title,
      body: input.body,
      category: input.category ?? "info",
      pinned: input.pinned ?? false,
    },
  });
  // Fan the announcement out to every unit in the building.
  const homes = await prisma.home.findMany({ where: { buildingId }, select: { id: true } });
  for (const h of homes) {
    await notify(h.id, { title: `📢 ${input.title}`, body: input.body, tag: "announcement" });
  }
  return { id: a.id, title: a.title, body: a.body, category: a.category, pinned: a.pinned, createdAt: a.createdAt.toISOString() };
}

// ─── Tickets (complaints) ────────────────────────────────────────────────────

function mapTicket(t: {
  id: string; homeId: string; category: string; title: string; description: string;
  status: TicketStatus; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: t.id,
    homeId: t.homeId,
    category: t.category,
    title: t.title,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function createTicket(
  homeId: string,
  createdById: string | null,
  input: { category: string; title: string; description: string }
) {
  const home = await prisma.home.findUnique({ where: { id: homeId }, select: { buildingId: true } });
  const t = await prisma.ticket.create({
    data: {
      homeId,
      buildingId: home?.buildingId ?? null,
      createdById,
      category: input.category,
      title: input.title,
      description: input.description,
    },
  });
  return mapTicket(t);
}

export async function listHomeTickets(homeId: string) {
  const rows = await prisma.ticket.findMany({ where: { homeId }, orderBy: { createdAt: "desc" }, take: 50 });
  return rows.map(mapTicket);
}

export async function listBuildingTickets(buildingId: string) {
  const rows = await prisma.ticket.findMany({
    where: { buildingId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { home: { select: { name: true } } },
  });
  return rows.map((t) => ({ ...mapTicket(t), homeName: t.home.name }));
}

export async function updateTicketStatus(id: string, status: TicketStatus) {
  const t = await prisma.ticket.update({ where: { id }, data: { status } });
  await notify(t.homeId, {
    title: "Update komplain",
    body: `"${t.title}" → ${status === "resolved" ? "Selesai" : status === "in_progress" ? "Diproses" : "Terbuka"}`,
    tag: "ticket.update",
  });
  return mapTicket(t);
}

// ─── Amenities & bookings ────────────────────────────────────────────────────

function mapBooking(b: { id: string; amenityId: string; homeId: string; startsAt: Date; endsAt: Date; status: string }) {
  return {
    id: b.id,
    amenityId: b.amenityId,
    homeId: b.homeId,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    status: b.status,
  };
}

export async function listAmenities(buildingId: string) {
  const amenities = await prisma.amenity.findMany({ where: { buildingId }, orderBy: { name: "asc" } });
  const from = new Date();
  const to = new Date(from.getTime() + 7 * 24 * 3600_000);
  const bookings = await prisma.amenityBooking.findMany({
    where: { amenityId: { in: amenities.map((a) => a.id) }, status: "booked", startsAt: { gte: from, lt: to } },
    orderBy: { startsAt: "asc" },
  });
  return amenities.map((a) => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    openHour: a.openHour,
    closeHour: a.closeHour,
    slotMinutes: a.slotMinutes,
    bookings: bookings.filter((b) => b.amenityId === a.id).map(mapBooking),
  }));
}

export async function bookAmenity(amenityId: string, homeId: string, startsAtIso: string) {
  const amenity = await prisma.amenity.findUnique({ where: { id: amenityId } });
  if (!amenity) throw Object.assign(new Error("Amenity not found"), { statusCode: 404 });
  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) throw Object.assign(new Error("Invalid slot"), { statusCode: 400 });
  const hour = startsAt.getUTCHours();
  if (hour < amenity.openHour || hour >= amenity.closeHour) {
    throw Object.assign(new Error("Di luar jam operasional."), { statusCode: 400 });
  }
  const endsAt = new Date(startsAt.getTime() + amenity.slotMinutes * 60_000);
  try {
    const b = await prisma.amenityBooking.create({ data: { amenityId, homeId, startsAt, endsAt } });
    return mapBooking(b);
  } catch {
    throw Object.assign(new Error("Slot sudah dipesan."), { statusCode: 409 });
  }
}

export async function listHomeBookings(homeId: string) {
  const rows = await prisma.amenityBooking.findMany({
    where: { homeId, status: "booked", endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { amenity: { select: { name: true, emoji: true } } },
  });
  return rows.map((b) => ({ ...mapBooking(b), amenityName: b.amenity.name, amenityEmoji: b.amenity.emoji }));
}

export async function cancelBooking(homeId: string, id: string) {
  const b = await prisma.amenityBooking.findFirst({ where: { id, homeId } });
  if (!b) throw Object.assign(new Error("Booking not found"), { statusCode: 404 });
  await prisma.amenityBooking.update({ where: { id }, data: { status: "cancelled" } });
  return { ok: true };
}

// ─── Parcels (locker) ────────────────────────────────────────────────────────

function mapParcel(p: { id: string; courier: string; description: string; code: string; status: string; arrivedAt: Date; pickedUpAt: Date | null }) {
  return {
    id: p.id,
    courier: p.courier,
    description: p.description,
    code: p.code,
    status: p.status,
    arrivedAt: p.arrivedAt.toISOString(),
    pickedUpAt: p.pickedUpAt?.toISOString() ?? null,
  };
}

export async function createParcel(homeId: string, input: { courier?: string; description?: string }) {
  const code = String(Math.floor(1000 + Math.random() * 9000)) + "-" + randomUUID().slice(0, 4).toUpperCase();
  const p = await prisma.parcel.create({
    data: { homeId, courier: input.courier ?? "", description: input.description ?? "Paket", code },
  });
  await notify(homeId, {
    title: "📦 Paket tiba",
    body: `${p.description}${p.courier ? ` dari ${p.courier}` : ""}. Kode ambil: ${code}`,
    tag: "parcel.arrived",
  });
  return mapParcel(p);
}

export async function listHomeParcels(homeId: string) {
  const rows = await prisma.parcel.findMany({ where: { homeId }, orderBy: { arrivedAt: "desc" }, take: 50 });
  return rows.map(mapParcel);
}

export async function pickupParcel(homeId: string, id: string) {
  const p = await prisma.parcel.findFirst({ where: { id, homeId } });
  if (!p) throw Object.assign(new Error("Parcel not found"), { statusCode: 404 });
  const updated = await prisma.parcel.update({ where: { id }, data: { status: "picked_up", pickedUpAt: new Date() } });
  return mapParcel(updated);
}

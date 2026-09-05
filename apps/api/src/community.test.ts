import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@satu-atap/db";
import {
  createAnnouncement, listAnnouncements,
  createTicket, listHomeTickets, listBuildingTickets, updateTicketStatus,
  bookAmenity, listHomeBookings,
  createParcel, pickupParcel, listHomeParcels,
} from "./community.js";

const HOME = "home-2";
const BUILDING = "building-2";
const AMENITY = "gym-b"; // seeded for building-2
const SLOT = new Date(Date.UTC(2030, 5, 1, 10)).toISOString(); // 10:00 UTC, within 6–22

describe("community", () => {
  afterAll(async () => {
    await prisma.announcement.deleteMany({ where: { buildingId: BUILDING, title: { startsWith: "Test Ann" } } });
    await prisma.ticket.deleteMany({ where: { homeId: HOME, title: { startsWith: "Test Ticket" } } });
    await prisma.amenityBooking.deleteMany({ where: { amenityId: AMENITY, homeId: HOME } });
    await prisma.parcel.deleteMany({ where: { homeId: HOME } });
  });

  it("posts and lists an announcement", async () => {
    const a = await createAnnouncement(BUILDING, "user-1", { title: "Test Ann Pemeliharaan", body: "Air mati 10.00" });
    const list = await listAnnouncements(BUILDING);
    expect(list.find((x) => x.id === a.id)).toBeTruthy();
  });

  it("creates a ticket and advances its status", async () => {
    const t = await createTicket(HOME, "user-1", { category: "plumbing", title: "Test Ticket Bocor", description: "Keran bocor" });
    expect((await listHomeTickets(HOME)).some((x) => x.id === t.id)).toBe(true);
    expect((await listBuildingTickets(BUILDING)).some((x) => x.id === t.id)).toBe(true);
    const updated = await updateTicketStatus(t.id, "resolved");
    expect(updated.status).toBe("resolved");
  });

  it("books an amenity slot and rejects a double-book", async () => {
    const b = await bookAmenity(AMENITY, HOME, SLOT);
    expect(b.status).toBe("booked");
    expect((await listHomeBookings(HOME)).some((x) => x.id === b.id)).toBe(true);
    await expect(bookAmenity(AMENITY, HOME, SLOT)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("logs a parcel and marks pickup", async () => {
    const p = await createParcel(HOME, { courier: "JNE", description: "Test Parcel" });
    expect(p.status).toBe("arrived");
    const picked = await pickupParcel(HOME, p.id);
    expect(picked.status).toBe("picked_up");
    expect((await listHomeParcels(HOME)).some((x) => x.id === p.id)).toBe(true);
  });
});

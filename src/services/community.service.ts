import { apiFetch } from "@/services/http";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: "info" | "maintenance" | "event" | "urgent";
  pinned: boolean;
  createdAt: string;
}

export type TicketStatus = "open" | "in_progress" | "resolved";

export interface Ticket {
  id: string;
  homeId: string;
  homeName?: string;
  category: string;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AmenityBooking {
  id: string;
  amenityId: string;
  homeId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  amenityName?: string;
  amenityEmoji?: string;
}

export interface Amenity {
  id: string;
  name: string;
  emoji: string;
  openHour: number;
  closeHour: number;
  slotMinutes: number;
  bookings: AmenityBooking[];
}

export interface Parcel {
  id: string;
  courier: string;
  description: string;
  code: string;
  status: "arrived" | "picked_up";
  arrivedAt: string;
  pickedUpAt: string | null;
}

/** Community layer: announcements, complaint tickets, amenity booking, parcels. */
export const communityService = {
  // Announcements
  getAnnouncements(homeId: string) {
    return apiFetch<Announcement[]>(`/v1/homes/${homeId}/announcements`);
  },
  createAnnouncement(buildingId: string, body: { title: string; body: string; category?: string; pinned?: boolean }) {
    return apiFetch<Announcement>(`/v1/buildings/${buildingId}/announcements`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  // Tickets
  getTickets(homeId: string) {
    return apiFetch<Ticket[]>(`/v1/homes/${homeId}/tickets`);
  },
  createTicket(homeId: string, body: { category: string; title: string; description: string }) {
    return apiFetch<Ticket>(`/v1/homes/${homeId}/tickets`, { method: "POST", body: JSON.stringify(body) });
  },
  getBuildingTickets(buildingId: string) {
    return apiFetch<Ticket[]>(`/v1/buildings/${buildingId}/tickets`);
  },
  updateTicketStatus(ticketId: string, status: TicketStatus) {
    return apiFetch<Ticket>(`/v1/tickets/${ticketId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
  // Amenities
  getAmenities(homeId: string) {
    return apiFetch<Amenity[]>(`/v1/homes/${homeId}/amenities`);
  },
  getBookings(homeId: string) {
    return apiFetch<AmenityBooking[]>(`/v1/homes/${homeId}/bookings`);
  },
  book(homeId: string, amenityId: string, startsAt: string) {
    return apiFetch<AmenityBooking>(`/v1/homes/${homeId}/bookings`, {
      method: "POST",
      body: JSON.stringify({ amenityId, startsAt }),
    });
  },
  cancelBooking(homeId: string, id: string) {
    return apiFetch<{ ok: boolean }>(`/v1/homes/${homeId}/bookings/${id}/cancel`, { method: "POST" });
  },
  // Parcels
  getParcels(homeId: string) {
    return apiFetch<Parcel[]>(`/v1/homes/${homeId}/parcels`);
  },
  createParcel(homeId: string, body: { courier?: string; description?: string }) {
    return apiFetch<Parcel>(`/v1/homes/${homeId}/parcels`, { method: "POST", body: JSON.stringify(body) });
  },
  pickupParcel(homeId: string, id: string) {
    return apiFetch<Parcel>(`/v1/homes/${homeId}/parcels/${id}/pickup`, { method: "POST" });
  },
};

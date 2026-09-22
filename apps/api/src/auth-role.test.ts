import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

async function login(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/v1/auth/login",
    payload: { email, password: "password123" },
  });
  return (res.json() as { data: { token: string } }).data.token;
}

describe("role self-switch escalation guard", () => {
  it("blocks a non-admin from self-assigning admin, and leaves the role unchanged", async () => {
    const app = await buildApp();
    try {
      const token = await login(app, "warga@satuatap.id"); // seeded resident
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/role",
        headers: { authorization: `Bearer ${token}` },
        payload: { role: "admin" },
      });
      expect(res.statusCode).toBe(403);

      const me = await app.inject({
        method: "GET",
        url: "/v1/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });
      expect((me.json() as { data: { role: string } }).data.role).toBe("resident");
    } finally {
      await app.close();
    }
  });

  it("allows an admin to (idempotently) keep the admin role", async () => {
    const app = await buildApp();
    try {
      const token = await login(app, "admin@satuatap.id"); // seeded admin
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/role",
        headers: { authorization: `Bearer ${token}` },
        payload: { role: "admin" },
      });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { data: { role: string } }).data.role).toBe("admin");
    } finally {
      await app.close();
    }
  });

  it("rejects the admin console for a non-admin", async () => {
    const app = await buildApp();
    try {
      const token = await login(app, "warga@satuatap.id");
      const res = await app.inject({
        method: "GET",
        url: "/v1/admin/menus",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});

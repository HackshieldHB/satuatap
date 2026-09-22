import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@satu-atap/db";
import { buildApp } from "./app.js";

const EMAIL = "resettest@satuatap.id";
const USER_ID = "user-resettest";

beforeAll(async () => {
  await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      id: USER_ID,
      email: EMAIL,
      passwordHash: await bcrypt.hash("oldpassword123", 10),
      fullName: "Reset Test",
      role: "resident",
    },
  });
});

afterAll(async () => {
  await prisma.passwordResetToken.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
});

describe("password reset flow", () => {
  it("forgot -> reset -> login with the new password", async () => {
    const app = await buildApp();
    try {
      const forgot = await app.inject({
        method: "POST",
        url: "/v1/auth/forgot",
        payload: { email: EMAIL },
      });
      expect(forgot.statusCode).toBe(200);
      const token = (forgot.json() as { data: { devToken?: string } }).data.devToken;
      expect(token).toBeTruthy();

      const reset = await app.inject({
        method: "POST",
        url: "/v1/auth/reset",
        payload: { token, password: "brandnew123" },
      });
      expect(reset.statusCode).toBe(200);

      const login = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { email: EMAIL, password: "brandnew123" },
      });
      expect(login.statusCode).toBe(200);

      // The token is single-use — a second reset must fail.
      const reuse = await app.inject({
        method: "POST",
        url: "/v1/auth/reset",
        payload: { token, password: "another123" },
      });
      expect(reuse.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("rejects an invalid token", async () => {
    const app = await buildApp();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/reset",
        payload: { token: "0000000000deadbeef", password: "whatever123" },
      });
      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("does not reveal whether an email exists", async () => {
    const app = await buildApp();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/forgot",
        payload: { email: "nobody-here@satuatap.id" },
      });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { data: { devToken?: string } }).data.devToken).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});

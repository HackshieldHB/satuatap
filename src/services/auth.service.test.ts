import { describe, it, expect, beforeEach } from "vitest";
import { authService, isJwtExpired } from "@/services/auth.service";
import { DEMO_CREDENTIALS } from "@/data/mock";

// Build a minimal unsigned JWT (header.payload.signature) with the given exp so
// we can exercise the client-side expiry guard without a real API.
function fakeJwt(expSeconds: number): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u1", exp: expSeconds })}.sig`;
}

describe("authService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("logs in with the demo credentials", async () => {
    const res = await authService.login({
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    });
    expect(res.success).toBe(true);
    expect(res.data?.user.email).toBe(DEMO_CREDENTIALS.email);
    expect(res.data?.user.role).toBe("manager");
  });

  it("rejects a wrong password", async () => {
    const res = await authService.login({
      email: DEMO_CREDENTIALS.email,
      password: "salah-password",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("persists then clears the session", async () => {
    await authService.login({
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    });
    expect(authService.getStoredSession()).not.toBeNull();
    authService.logout();
    expect(authService.getStoredSession()).toBeNull();
  });

  it("rejects an incorrect OTP code", async () => {
    const res = await authService.verifyOtp("000000");
    expect(res.success).toBe(false);
  });

  it("flags an expired JWT and leaves a valid one alone", () => {
    expect(isJwtExpired(fakeJwt(Math.floor(Date.now() / 1000) - 60))).toBe(true);
    expect(isJwtExpired(fakeJwt(Math.floor(Date.now() / 1000) + 3600))).toBe(false);
    expect(isJwtExpired("mock-jwt-token")).toBe(false); // not a JWT → no expiry
  });

  it("drops an expired session so the user is sent back to login", () => {
    const expired = {
      user: { id: "u1", fullName: "T", email: "t@t.id", phone: "", createdAt: "" },
      token: fakeJwt(Math.floor(Date.now() / 1000) - 60),
      onboardingCompleted: true,
      selectedHomeId: "home-1",
    };
    localStorage.setItem("huni_session", JSON.stringify(expired));
    expect(authService.getStoredSession()).toBeNull();
    expect(localStorage.getItem("huni_session")).toBeNull();
  });

  it("keeps a session whose JWT is still valid", () => {
    const live = {
      user: { id: "u1", fullName: "T", email: "t@t.id", phone: "", createdAt: "" },
      token: fakeJwt(Math.floor(Date.now() / 1000) + 3600),
      onboardingCompleted: true,
      selectedHomeId: "home-1",
    };
    localStorage.setItem("huni_session", JSON.stringify(live));
    expect(authService.getStoredSession()).not.toBeNull();
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { authService } from "@/services/auth.service";
import { DEMO_CREDENTIALS } from "@/data/mock";

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
});

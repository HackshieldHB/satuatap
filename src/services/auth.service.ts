import type {
  AuthCredentials,
  RegisterData,
  AuthSession,
  ApiResponse,
  OnboardingData,
  AppRole,
} from "@/types";
import { DEMO_CREDENTIALS, MOCK_USER } from "@/data/mock";
import { delay } from "@/lib/utils";
import { useMockData } from "@/lib/config";
import { apiFetch } from "@/services/http";

const STORAGE_KEY = "huni_session";
const OTP_CODE = "123456";
const MOCK_TOKEN = "mock-jwt-token";

// Decode the `exp` (seconds since epoch) out of a JWT without verifying it — we
// only need to know if it is already past so we don't strand the user on a
// broken dashboard with a dead token. Returns null for non-JWT tokens (e.g. the
// mock token) or anything unparseable, which are treated as "no expiry here".
function decodeJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewMs = 0): boolean {
  const exp = decodeJwtExp(token);
  if (exp === null) return false;
  return exp * 1000 - skewMs <= Date.now();
}

export class AuthService {
  async login(
    credentials: AuthCredentials
  ): Promise<ApiResponse<AuthSession>> {
    if (!useMockData) {
      const res = await apiFetch<AuthSession>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      if (res.success && res.data) this.saveSession(res.data);
      return res;
    }

    await delay(800);

    const isValid =
      credentials.email === DEMO_CREDENTIALS.email &&
      credentials.password === DEMO_CREDENTIALS.password;

    if (!isValid) {
      return {
        success: false,
        error: "Email atau kata sandi salah.",
      };
    }

    const session: AuthSession = {
      user: MOCK_USER,
      token: MOCK_TOKEN,
      onboardingCompleted: this.getStoredSession()?.onboardingCompleted ?? true,
      selectedHomeId: "home-1",
    };

    this.saveSession(session);
    return { success: true, data: session };
  }

  async register(data: RegisterData): Promise<ApiResponse<{ pendingOtp: true }>> {
    await delay(600);

    if (!data.fullName || !data.email || !data.phone || !data.password) {
      return { success: false, error: "Semua field wajib diisi." };
    }

    if (data.password.length < 8) {
      return {
        success: false,
        error: "Kata sandi minimal 8 karakter.",
      };
    }

    sessionStorage.setItem("huni_pending_register", JSON.stringify(data));
    return { success: true, data: { pendingOtp: true } };
  }

  async verifyOtp(code: string): Promise<ApiResponse<AuthSession>> {
    await delay(700);

    if (code !== OTP_CODE) {
      return { success: false, error: "Kode verifikasi salah. Coba lagi." };
    }

    const pending = sessionStorage.getItem("huni_pending_register");
    const registerData = pending ? JSON.parse(pending) : null;

    const session: AuthSession = {
      user: registerData
        ? {
            id: "user-new",
            fullName: registerData.fullName,
            email: registerData.email,
            phone: registerData.phone,
            createdAt: new Date().toISOString(),
          }
        : MOCK_USER,
      token: MOCK_TOKEN,
      onboardingCompleted: false,
    };

    sessionStorage.removeItem("huni_pending_register");
    this.saveSession(session);
    return { success: true, data: session };
  }

  async resendOtp(): Promise<ApiResponse<{ sent: true }>> {
    await delay(500);
    return { success: true, data: { sent: true } };
  }

  async forgotPassword(
    identifier: string
  ): Promise<ApiResponse<{ sent: true }>> {
    await delay(600);
    sessionStorage.setItem("huni_reset_identifier", identifier);
    return { success: true, data: { sent: true } };
  }

  async resetPassword(
    password: string
  ): Promise<ApiResponse<{ updated: true }>> {
    await delay(600);

    if (password.length < 8) {
      return {
        success: false,
        error: "Kata sandi minimal 8 karakter.",
      };
    }

    sessionStorage.removeItem("huni_reset_identifier");
    return { success: true, data: { updated: true } };
  }

  async completeOnboarding(_data: OnboardingData): Promise<ApiResponse<AuthSession>> {
    await delay(500);
    const session = this.getStoredSession();
    if (!session) {
      return { success: false, error: "Sesi tidak ditemukan." };
    }

    const updated: AuthSession = {
      ...session,
      onboardingCompleted: true,
      selectedHomeId: "home-1",
    };

    this.saveSession(updated);
    return { success: true, data: updated };
  }

  getStoredSession(): AuthSession | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as AuthSession;
      // A session minted in mock mode carries a fake token the real API always
      // rejects with 401. Switching NEXT_PUBLIC_ENABLE_MOCK_DATA to false does
      // not clear it, so the app would sit "logged in" yet every request fails
      // and the dashboard loads forever. Drop it and force a real re-login.
      if (!useMockData && session.token === MOCK_TOKEN) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      // Drop an expired real JWT. Otherwise the guard passes (a session exists),
      // the app skips the login screen, and every API call 401s — the "logged
      // in but dashboard is broken" dead zone. Clearing it forces a clean
      // re-login instead.
      if (session.token && session.token !== MOCK_TOKEN && isJwtExpired(session.token)) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  saveSession(session: AuthSession): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  logout(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }

  // Sliding session: while the current token is still valid, ask the API for a
  // fresh one so an active user's session keeps rolling forward and they are not
  // forced to log in again every time the original token ages out. No-ops in
  // mock mode, without a real token, or if the token is already expired (the
  // 401 handler / getStoredSession will have cleared it by then).
  async refreshToken(): Promise<void> {
    if (useMockData) return;
    const session = this.getStoredSession();
    if (!session?.token || session.token === MOCK_TOKEN) return;
    if (isJwtExpired(session.token)) return;
    const res = await apiFetch<{ token: string }>("/v1/auth/refresh", {
      method: "POST",
    });
    if (res.success && res.data?.token) {
      const current = this.getStoredSession();
      if (current) this.saveSession({ ...current, token: res.data.token });
    }
  }

  updateSelectedHome(homeId: string): void {
    const session = this.getStoredSession();
    if (!session) return;
    this.saveSession({ ...session, selectedHomeId: homeId });
  }

  // Demo: switch the current user's app role (persisted server-side) and mirror
  // it into the stored session so the menu updates immediately.
  async setRole(role: AppRole): Promise<ApiResponse<{ role: AppRole }>> {
    const res = await apiFetch<{ role: AppRole }>("/v1/auth/role", {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    if (res.success && res.data) {
      const session = this.getStoredSession();
      if (session) this.saveSession({ ...session, user: { ...session.user, role: res.data.role } });
    }
    return res;
  }
}

export const authService = new AuthService();

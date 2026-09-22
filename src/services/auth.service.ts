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
    credentials: AuthCredentials,
    remember = false
  ): Promise<ApiResponse<AuthSession>> {
    if (!useMockData) {
      const res = await apiFetch<AuthSession>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ ...credentials, remember }),
      });
      if (res.success && res.data) this.saveSession(res.data, remember);
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

    this.saveSession(session, remember);
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
  ): Promise<ApiResponse<{ sent: true; devToken?: string }>> {
    if (!useMockData) {
      return apiFetch<{ sent: true; devToken?: string }>("/v1/auth/forgot", {
        method: "POST",
        body: JSON.stringify({ email: identifier }),
      });
    }
    await delay(600);
    sessionStorage.setItem("huni_reset_identifier", identifier);
    return { success: true, data: { sent: true } };
  }

  async resetPassword(
    token: string,
    password: string
  ): Promise<ApiResponse<{ updated: true }>> {
    if (!useMockData) {
      return apiFetch<{ updated: true }>("/v1/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
    }
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

  // Which store currently holds the session. "Ingat saya" (remember me) picks
  // between them: localStorage = persistent (survives closing the browser →
  // auto-resume the dashboard), sessionStorage = this browsing session only
  // (cleared on close → a fresh visit lands on the login form).
  private currentStore(): Storage | null {
    if (typeof window === "undefined") return null;
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return window.localStorage;
    } catch {
      /* ignore */
    }
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY)) return window.sessionStorage;
    } catch {
      /* ignore */
    }
    return null;
  }

  getStoredSession(): AuthSession | null {
    if (typeof window === "undefined") return null;
    const store = this.currentStore();
    if (!store) return null;
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as AuthSession;
      // A session minted in mock mode carries a fake token the real API always
      // rejects with 401. Switching NEXT_PUBLIC_ENABLE_MOCK_DATA to false does
      // not clear it, so the app would sit "logged in" yet every request fails
      // and the dashboard loads forever. Drop it and force a real re-login.
      if (!useMockData && session.token === MOCK_TOKEN) {
        store.removeItem(STORAGE_KEY);
        return null;
      }
      // Drop an expired real JWT. Otherwise the guard passes (a session exists),
      // the app skips the login screen, and every API call 401s — the "logged
      // in but dashboard is broken" dead zone. Clearing it forces a clean
      // re-login instead.
      if (session.token && session.token !== MOCK_TOKEN && isJwtExpired(session.token)) {
        store.removeItem(STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  // `persistent` undefined = keep the session in whichever store it already
  // lives (so refresh/role/home updates don't silently change its lifetime);
  // true = localStorage (remember me), false = sessionStorage (this session).
  saveSession(session: AuthSession, persistent?: boolean): void {
    if (typeof window === "undefined") return;
    let store: Storage;
    if (persistent === undefined) {
      store = this.currentStore() ?? window.localStorage;
    } else {
      store = persistent ? window.localStorage : window.sessionStorage;
    }
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
    // Keep a single source of truth so a stale copy in the other store can't
    // resurrect a session the user meant to leave behind.
    const other = store === window.localStorage ? window.sessionStorage : window.localStorage;
    try {
      other.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  logout(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
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

import type {
  AuthCredentials,
  RegisterData,
  AuthSession,
  ApiResponse,
  OnboardingData,
} from "@/types";
import { DEMO_CREDENTIALS, MOCK_USER } from "@/data/mock";
import { delay } from "@/lib/utils";
import { useMockData } from "@/lib/config";
import { apiFetch } from "@/services/http";

const STORAGE_KEY = "huni_session";
const OTP_CODE = "123456";

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
      token: "mock-jwt-token",
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
      token: "mock-jwt-token",
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
      return JSON.parse(raw) as AuthSession;
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

  updateSelectedHome(homeId: string): void {
    const session = this.getStoredSession();
    if (!session) return;
    this.saveSession({ ...session, selectedHomeId: homeId });
  }
}

export const authService = new AuthService();

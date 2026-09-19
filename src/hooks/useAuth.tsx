"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { AuthSession, User, AppRole } from "@/types";
import { authService } from "@/services/auth.service";

interface AuthContextValue {
  session: AuthSession | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: typeof authService.login;
  logout: () => void;
  refreshSession: () => void;
  updateSelectedHome: (homeId: string) => void;
  setRole: (role: AppRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(() => {
    const stored = authService.getStoredSession();
    setSession(stored);
  }, []);

  useEffect(() => {
    refreshSession();
    setIsLoading(false);
    // Roll the session forward while it's still valid so an active user isn't
    // forced to log in again once the original token ages out.
    void authService.refreshToken().then(() => refreshSession());
  }, [refreshSession]);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  const updateSelectedHome = useCallback((homeId: string) => {
    authService.updateSelectedHome(homeId);
    refreshSession();
  }, [refreshSession]);

  const setRole = useCallback(async (role: AppRole) => {
    const res = await authService.setRole(role);
    if (res.success) refreshSession();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isAuthenticated: !!session,
      login: authService.login.bind(authService),
      logout,
      refreshSession,
      updateSelectedHome,
      setRole,
    }),
    [session, isLoading, logout, refreshSession, updateSelectedHome, setRole]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

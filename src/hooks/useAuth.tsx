"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthSession, User } from "@/types";
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
  }, [refreshSession]);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  const updateSelectedHome = useCallback((homeId: string) => {
    authService.updateSelectedHome(homeId);
    refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        isAuthenticated: !!session,
        login: authService.login.bind(authService),
        logout,
        refreshSession,
        updateSelectedHome,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

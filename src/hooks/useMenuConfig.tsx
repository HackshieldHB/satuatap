"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { adminService } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { useMockData } from "@/lib/config";

interface MenuConfigValue {
  // Admin-configured menu visibility (key → visible). null = not loaded yet or
  // unavailable, in which case callers fall back to the static role mapping.
  menus: Record<string, boolean> | null;
}

const MenuConfigContext = createContext<MenuConfigValue>({ menus: null });

export function MenuConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [menus, setMenus] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    // Mock mode has no API — keep the static role-based fallback.
    if (useMockData || !isAuthenticated) {
      setMenus(null);
      return;
    }
    let cancelled = false;
    adminService.getMenuConfig().then((res) => {
      if (!cancelled && res.success && res.data) setMenus(res.data.menus);
    });
    return () => {
      cancelled = true;
    };
    // Re-fetch when the role changes (e.g. demo role switch) so the menu updates.
  }, [isAuthenticated, user?.role]);

  return (
    <MenuConfigContext.Provider value={{ menus }}>{children}</MenuConfigContext.Provider>
  );
}

export function useMenuConfig() {
  return useContext(MenuConfigContext);
}

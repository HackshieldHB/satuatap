import type { AppRole, ApiResponse } from "@/types";
import { apiFetch } from "@/services/http";

export interface MenuConfig {
  role: AppRole;
  menus: Record<string, boolean>;
}

export interface AdminMenuMatrix {
  roles: AppRole[];
  catalog: { key: string; label: string }[];
  matrix: Record<string, Record<string, boolean>>;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
}

export const adminService = {
  // Effective menu visibility for the current user's role.
  getMenuConfig(): Promise<ApiResponse<MenuConfig>> {
    return apiFetch<MenuConfig>("/v1/menu-config");
  },

  getMenuMatrix(): Promise<ApiResponse<AdminMenuMatrix>> {
    return apiFetch<AdminMenuMatrix>("/v1/admin/menus");
  },

  saveMenuMatrix(
    updates: { role: AppRole; menuKey: string; visible: boolean }[]
  ): Promise<ApiResponse<{ updated: number }>> {
    return apiFetch<{ updated: number }>("/v1/admin/menus", {
      method: "PUT",
      body: JSON.stringify({ updates }),
    });
  },

  getUsers(): Promise<ApiResponse<AdminUser[]>> {
    return apiFetch<AdminUser[]>("/v1/admin/users");
  },

  setUserRole(id: string, role: AppRole): Promise<ApiResponse<{ id: string; role: AppRole }>> {
    return apiFetch<{ id: string; role: AppRole }>(`/v1/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  },
};

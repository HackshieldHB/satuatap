import { apiBaseUrl } from "@/lib/config";
import type { ApiResponse } from "@/types";

const STORAGE_KEY = "huni_session";

function token(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as { token?: string };
    return session.token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  const t = token();
  if (t) headers.set("authorization", `Bearer ${t}`);
  try {
    const res = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
    const json = (await res.json()) as ApiResponse<T> & { error?: string };
    if (!res.ok) {
      return { success: false, error: json.error ?? `HTTP ${res.status}` };
    }
    return json;
  } catch {
    return { success: false, error: "Tidak dapat terhubung ke API." };
  }
}

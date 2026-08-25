import { apiBaseUrl, edgeBaseUrl } from "@/lib/config";
import { setLocalMode } from "@/lib/local-mode";
import type { ApiResponse } from "@/types";

const STORAGE_KEY = "huni_session";
const CLOUD_TIMEOUT_MS = 2000;

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

function withAuth(init: RequestInit): Headers {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  const t = token();
  if (t) headers.set("authorization", `Bearer ${t}`);
  return headers;
}

async function fetchTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function edgePath(path: string): string {
  if (path.startsWith("/v1/")) return `/local${path.slice(3)}`;
  return path;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = withAuth(init);
  try {
    const res = await fetchTimeout(`${apiBaseUrl}${path}`, { ...init, headers }, CLOUD_TIMEOUT_MS);
    const json = (await res.json()) as ApiResponse<T> & { error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    setLocalMode(false);
    return json;
  } catch {
    try {
      const res = await fetchTimeout(`${edgeBaseUrl}${edgePath(path)}`, { ...init, headers }, CLOUD_TIMEOUT_MS);
      const json = (await res.json()) as ApiResponse<T> & { error?: string };
      if (!res.ok) {
        return { success: false, error: json.error ?? `HTTP ${res.status}` };
      }
      setLocalMode(true);
      return { ...json, degraded: true };
    } catch {
      return { success: false, error: "Tidak dapat terhubung ke API." };
    }
  }
}

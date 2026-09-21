import { apiBaseUrl, edgeBaseUrl } from "@/lib/config";
import { setLocalMode } from "@/lib/local-mode";
import type { ApiResponse } from "@/types";

const STORAGE_KEY = "huni_session";
// Dev + Cloudflare tunnel add RTT; 2s was aborting dashboard/login before the
// API finished, so the UI showed a failed/empty load. Edge stays short.
const CLOUD_TIMEOUT_MS = 10_000;
const EDGE_TIMEOUT_MS = 3_000;

// The session lives in localStorage (remember me) OR sessionStorage (this
// browsing session only), so read from whichever holds it.
function rawSession(): string | null {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) return local;
  } catch {
    /* ignore */
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function token(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = rawSession();
    if (!raw) return null;
    const session = JSON.parse(raw) as { token?: string };
    return session.token ?? null;
  } catch {
    return null;
  }
}

// A 401 on any non-login endpoint means the stored token is no longer accepted
// by the API (expired, revoked, or the server's JWT secret rotated). Clear the
// dead session and send the user to the login screen once, instead of leaving
// them "logged in" on a dashboard where every request silently fails.
function handleUnauthorized(path: string): void {
  if (typeof window === "undefined") return;
  if (path.startsWith("/v1/auth/login")) return; // bad credentials, not a dead session
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (!window.location.pathname.startsWith("/login")) {
    window.location.replace("/login");
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
    if (res.ok) {
      setLocalMode(false);
      return json;
    }
    if (res.status < 500) {
      setLocalMode(false);
      if (res.status === 401) handleUnauthorized(path);
      return { success: false, error: json.error ?? `HTTP ${res.status}` };
    }
    throw new Error(json.error ?? `HTTP ${res.status}`);
  } catch {
    try {
      const res = await fetchTimeout(`${edgeBaseUrl}${edgePath(path)}`, { ...init, headers }, EDGE_TIMEOUT_MS);
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

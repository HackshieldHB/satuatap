import { apiFetch } from "@/services/http";

export interface AccessPass {
  id: string;
  label: string;
  kind: "guest" | "courier" | "resident";
  pin: string;
  token: string;
  validFrom: string;
  validUntil: string;
  maxUses: number;
  uses: number;
  revoked: boolean;
  active: boolean;
  createdAt: string;
}

export interface AccessLog {
  id: string;
  passId: string | null;
  action: "granted" | "denied" | "resident_unlock";
  actorLabel: string;
  reason: string | null;
  occurredAt: string;
}

export interface CreatePassInput {
  label: string;
  kind?: "guest" | "courier" | "resident";
  validMinutes?: number;
  maxUses?: number;
}

export interface VerifyResult {
  granted: boolean;
  label?: string;
  kind?: string;
  error?: string;
}

/**
 * Access control. Residents mint time-boxed guest/courier passes (PIN + QR
 * token) and open their own door; a door panel verifies a code to drive the
 * lock actuator, and every attempt is logged.
 */
export const accessService = {
  getPasses(homeId: string) {
    return apiFetch<AccessPass[]>(`/v1/homes/${homeId}/access-passes`);
  },
  createPass(homeId: string, body: CreatePassInput) {
    return apiFetch<AccessPass>(`/v1/homes/${homeId}/access-passes`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  revokePass(homeId: string, id: string) {
    return apiFetch<AccessPass>(`/v1/homes/${homeId}/access-passes/${id}/revoke`, {
      method: "POST",
    });
  },
  getLogs(homeId: string) {
    return apiFetch<AccessLog[]>(`/v1/homes/${homeId}/access-logs`);
  },
  unlock(homeId: string) {
    return apiFetch<{ ok: boolean }>(`/v1/homes/${homeId}/unlock`, { method: "POST" });
  },
  verify(homeId: string, code: string) {
    return apiFetch<VerifyResult>(`/v1/homes/${homeId}/access/verify`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
};

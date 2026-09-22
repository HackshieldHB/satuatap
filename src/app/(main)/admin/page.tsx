"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  adminService,
  type AdminMenuMatrix,
  type AdminUser,
  type AuditEntry,
} from "@/services/admin.service";
import type { AppRole } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ShieldCheck, Check, Save, RotateCcw, Users, ScrollText } from "lucide-react";

const ROLE_LABEL: Record<AppRole, string> = {
  resident: "Penghuni",
  manager: "Pengelola",
  operator: "Operator",
  admin: "Admin",
};

export default function AdminPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<AdminMenuMatrix | null>(null);
  // Local editable copy of the matrix (role → menuKey → visible).
  const [draft, setDraft] = useState<Record<string, Record<string, boolean>>>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyUser, setBusyUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [m, u, a] = await Promise.all([
      adminService.getMenuMatrix(),
      adminService.getUsers(),
      adminService.getAudit(50),
    ]);
    if (m.success && m.data) {
      setData(m.data);
      setDraft(structuredClone(m.data.matrix));
    }
    if (u.success && u.data) setUsers(u.data);
    if (a.success && a.data) setAudit(a.data);
  }, []);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user?.role, load]);

  const dirty = useMemo(() => {
    if (!data) return [];
    const out: { role: AppRole; menuKey: string; visible: boolean }[] = [];
    for (const role of data.roles) {
      for (const item of data.catalog) {
        const now = draft[role]?.[item.key] ?? false;
        if (now !== data.matrix[role]?.[item.key]) {
          out.push({ role, menuKey: item.key, visible: now });
        }
      }
    }
    return out;
  }, [data, draft]);

  function toggle(role: AppRole, key: string) {
    // Guard: don't let anyone hide the admin console from admins.
    if (role === "admin" && key === "admin") return;
    setDraft((d) => ({
      ...d,
      [role]: { ...d[role], [key]: !d[role]?.[key] },
    }));
  }

  async function save() {
    if (dirty.length === 0) return;
    setSaving(true);
    try {
      const res = await adminService.saveMenuMatrix(dirty);
      if (res.success) {
        showToast(`Menu diperbarui (${dirty.length} perubahan).`, "success");
        await load();
      } else {
        showToast(res.error ?? "Gagal menyimpan.", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeUserRole(u: AdminUser, role: AppRole) {
    setBusyUser(u.id);
    try {
      const res = await adminService.setUserRole(u.id, role);
      if (res.success) {
        setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)));
        showToast(`${u.fullName} → ${ROLE_LABEL[role]}.`, "success");
      } else {
        showToast(res.error ?? "Gagal mengubah role.", "error");
      }
    } finally {
      setBusyUser(null);
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 font-semibold">Khusus Administrator</p>
          <p className="text-sm text-muted">
            Halaman ini hanya untuk role Admin aplikasi.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Administrasi
        </h1>
        <p className="text-sm text-muted">
          Atur menu yang tampil per role, dan tetapkan role tiap pengguna.
          <span className="block text-xs mt-0.5">
            Catatan: ini mengatur <b>tampilan menu</b>, bukan hak akses data —
            keamanan tetap dijaga di sisi server.
          </span>
        </p>
      </div>

      {/* Menu × Role matrix */}
      <Card className="p-4 overflow-x-auto">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold">Menu per Role</h2>
          <div className="flex gap-2">
            {dirty.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => data && setDraft(structuredClone(data.matrix))}
              >
                <RotateCcw className="h-4 w-4" /> Batal
              </Button>
            )}
            <Button size="sm" disabled={dirty.length === 0 || saving} onClick={save}>
              <Save className="h-4 w-4" /> Simpan{dirty.length > 0 ? ` (${dirty.length})` : ""}
            </Button>
          </div>
        </div>

        {!data ? (
          <p className="text-sm text-muted py-6 text-center">Memuat…</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-3 font-medium sticky left-0 bg-surface">Menu</th>
                {data.roles.map((r) => (
                  <th key={r} className="px-2 py-2 font-medium text-center whitespace-nowrap">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.catalog.map((item) => (
                <tr key={item.key} className="border-t border-border">
                  <td className="py-1.5 pr-3 sticky left-0 bg-surface">{item.label}</td>
                  {data.roles.map((r) => {
                    const on = draft[r]?.[item.key] ?? false;
                    const locked = r === "admin" && item.key === "admin";
                    return (
                      <td key={r} className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => toggle(r, item.key)}
                          aria-pressed={on}
                          aria-label={`${item.label} untuk ${ROLE_LABEL[r]}`}
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                            on
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-background text-transparent hover:border-primary/50",
                            locked && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Users → role */}
      <Card className="p-4">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Users className="h-4 w-4" /> Pengguna & Role
        </h2>
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-medium truncate">{u.fullName}</p>
                <p className="text-xs text-muted truncate">{u.email}</p>
              </div>
              <select
                value={u.role}
                disabled={busyUser === u.id}
                onChange={(e) => changeUserRole(u, e.target.value as AppRole)}
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
              >
                {(["resident", "manager", "operator", "admin"] as AppRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-muted py-4 text-center">Belum ada pengguna.</p>
          )}
        </div>
      </Card>

      {/* Audit trail */}
      <Card className="p-4">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <ScrollText className="h-4 w-4" /> Riwayat Aktivitas
        </h2>
        <div className="divide-y divide-border">
          {audit.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="text-primary">{e.action}</span>
                  <span className="text-muted"> · {e.entity}{e.entityId ? ` (${e.entityId})` : ""}</span>
                </p>
                <p className="text-xs text-muted truncate">
                  {e.actor ? e.actor.fullName : "sistem"}
                  {e.metadata ? ` · ${JSON.stringify(e.metadata)}` : ""}
                </p>
              </div>
              <time className="shrink-0 text-xs text-muted whitespace-nowrap">
                {new Date(e.createdAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          ))}
          {audit.length === 0 && (
            <p className="text-sm text-muted py-4 text-center">Belum ada aktivitas tercatat.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

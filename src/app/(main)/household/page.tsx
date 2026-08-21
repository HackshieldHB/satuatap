"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { MOCK_HOUSEHOLD } from "@/data/mock";
import { UserPlus, Trash2, ShieldCheck } from "lucide-react";
import type { HouseholdMember, HouseholdRole } from "@/types";

const ROLE_LABELS: Record<HouseholdRole, string> = {
  owner: "Pemilik",
  admin: "Admin",
  member: "Anggota",
  guest: "Tamu",
  limited: "Terbatas",
};

const INVITE_ROLES: HouseholdRole[] = ["admin", "member", "guest", "limited"];

const ROLE_HINT: Record<HouseholdRole, string> = {
  owner: "Akses penuh",
  admin: "Kelola perangkat & anggota",
  member: "Kontrol perangkat",
  guest: "Akses sementara terbatas",
  limited: "Hanya perangkat tertentu",
};

export default function HouseholdPage() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<HouseholdMember[]>(() =>
    MOCK_HOUSEHOLD.filter((m) => m.homeId === "home-1").map((m) => ({ ...m }))
  );
  const [inviting, setInviting] = useState(false);

  const remove = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    showToast("Anggota dikeluarkan.", "info");
  };

  const setRole = (id: string, role: HouseholdRole) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));

  const invite = (name: string, email: string, role: HouseholdRole) => {
    setMembers((prev) => [
      ...prev,
      { id: `hh-${Date.now()}`, homeId: "home-1", name, email, role },
    ]);
    setInviting(false);
    showToast(`Undangan dikirim ke ${email}.`, "success");
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Anggota Rumah</h1>
          <p className="text-sm text-muted">
            Atur siapa yang bisa mengakses rumah pintarmu.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setInviting(true)}>
          <UserPlus className="h-4 w-4" />
          Undang
        </Button>
      </div>

      <div className="space-y-3">
        {members.map((m) => (
          <Card key={m.id} className="flex items-center gap-3">
            <Avatar name={m.name} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{m.name}</p>
                {m.role === "owner" && (
                  <Badge variant="secondary">{ROLE_LABELS.owner}</Badge>
                )}
              </div>
              <p className="text-xs text-muted truncate">{m.email}</p>
              <p className="text-[11px] text-muted mt-0.5">
                {ROLE_HINT[m.role]}
              </p>
            </div>
            {m.role !== "owner" && (
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <select
                  value={m.role}
                  onChange={(e) =>
                    setRole(m.id, e.target.value as HouseholdRole)
                  }
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
                  aria-label={`Peran ${m.name}`}
                >
                  {INVITE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(m.id)}
                  className="text-muted hover:text-error"
                  aria-label={`Keluarkan ${m.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 text-secondary shrink-0" />
        Peran <b className="text-foreground">Tamu</b> otomatis kedaluwarsa dan
        cocok untuk PRT atau tamu menginap.
      </div>

      <InviteSheet
        open={inviting}
        onClose={() => setInviting(false)}
        onInvite={invite}
      />
    </div>
  );
}

function InviteSheet({
  open,
  onClose,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (name: string, email: string, role: HouseholdRole) => void;
}) {
  return (
    <BottomSheet isOpen={open} onClose={onClose} title="Undang Anggota">
      {open && <InviteForm onInvite={onInvite} />}
    </BottomSheet>
  );
}

function InviteForm({
  onInvite,
}: {
  onInvite: (name: string, email: string, role: HouseholdRole) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<HouseholdRole>("member");

  return (
    <div className="space-y-4">
      <Input
        label="Nama"
        placeholder="Nama anggota"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label="Email"
        type="email"
        placeholder="email@contoh.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div>
        <p className="text-sm font-medium mb-1.5">Peran</p>
        <div className="grid grid-cols-2 gap-2">
          {INVITE_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "rounded-lg border p-2.5 text-left transition-all",
                role === r
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <p className="text-sm font-medium">{ROLE_LABELS[r]}</p>
              <p className="text-[11px] text-muted">{ROLE_HINT[r]}</p>
            </button>
          ))}
        </div>
      </div>
      <Button
        className="w-full"
        onClick={() => onInvite(name.trim(), email.trim(), role)}
        disabled={!name.trim() || !email.trim()}
      >
        Kirim Undangan
      </Button>
    </div>
  );
}

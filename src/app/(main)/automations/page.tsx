"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { resolveIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  MOCK_AUTOMATIONS,
  AUTOMATION_TRIGGERS,
  AUTOMATION_ACTIONS,
} from "@/data/mock";
import { Plus, Trash2, ArrowRight, Zap, Bot } from "lucide-react";
import type { AutomationRule, AutomationTriggerType } from "@/types";

export default function AutomationsPage() {
  const { showToast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>(() =>
    MOCK_AUTOMATIONS.map((r) => ({ ...r }))
  );
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) =>
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );

  const remove = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    showToast("Otomatisasi dihapus.", "info");
  };

  const create = (rule: AutomationRule) => {
    setRules((prev) => [rule, ...prev]);
    setCreating(false);
    showToast("Otomatisasi dibuat 🎉", "success");
  };

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Otomatisasi</h1>
          <p className="text-sm text-muted">
            {activeCount} aturan aktif — rumah bekerja sendiri.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Buat
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Belum ada otomatisasi"
          description="Buat aturan JIKA → MAKA agar perangkat bekerja otomatis."
          actionLabel="Buat Otomatisasi"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="space-y-3">
          {rules.map((r, i) => {
            const Icon = resolveIcon(r.icon, Zap);
            return (
              <Card
                key={r.id}
                className="animate-pop-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      r.enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-background text-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      <b className="text-foreground/80">JIKA</b> {r.triggerLabel}
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {r.actionLabels.map((a, j) => (
                        <p
                          key={j}
                          className="text-xs text-muted flex items-center gap-1"
                        >
                          <ArrowRight className="h-3 w-3 text-secondary shrink-0" />
                          {a}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Toggle
                      checked={r.enabled}
                      onChange={() => toggle(r.id)}
                      label={r.name}
                    />
                    <button
                      onClick={() => remove(r.id)}
                      className="text-muted hover:text-error"
                      aria-label="Hapus otomatisasi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={create}
      />
    </div>
  );
}

function CreateSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (r: AutomationRule) => void;
}) {
  return (
    <BottomSheet isOpen={open} onClose={onClose} title="Buat Otomatisasi">
      {open && <CreateForm onCreate={onCreate} />}
    </BottomSheet>
  );
}

function CreateForm({ onCreate }: { onCreate: (r: AutomationRule) => void }) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);

  const toggleAction = (id: string) =>
    setActions((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );

  const submit = () => {
    const t = AUTOMATION_TRIGGERS.find((x) => x.id === trigger);
    if (!t || actions.length === 0) return;
    onCreate({
      id: `auto-${Date.now()}`,
      name: name.trim() || t.label,
      enabled: true,
      icon: t.icon,
      triggerType: t.id as AutomationTriggerType,
      triggerLabel: t.label,
      actionLabels: actions.map(
        (a) => AUTOMATION_ACTIONS.find((x) => x.id === a)?.label ?? a
      ),
    });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Nama otomatisasi"
        placeholder="mis. Lampu malam"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div>
        <p className="text-xs font-medium text-muted mb-2">JIKA (pemicu)</p>
        <div className="space-y-2">
          {AUTOMATION_TRIGGERS.map((t) => {
            const Icon = resolveIcon(t.icon);
            const active = trigger === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTrigger(t.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border p-3 text-sm transition-all",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-foreground hover:border-primary/40"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted mb-2">MAKA (aksi)</p>
        <div className="space-y-2">
          {AUTOMATION_ACTIONS.map((a) => {
            const active = actions.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggleAction(a.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-3 text-sm transition-all",
                  active
                    ? "border-secondary bg-secondary/5 text-secondary"
                    : "border-border text-foreground hover:border-secondary/40"
                )}
              >
                {a.label}
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                    active ? "bg-secondary text-white" : "border border-border"
                  )}
                >
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        className="w-full"
        onClick={submit}
        disabled={!trigger || actions.length === 0}
      >
        Simpan Otomatisasi
      </Button>
    </div>
  );
}

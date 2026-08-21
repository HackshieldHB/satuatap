"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useTheme } from "@/hooks/useTheme";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import {
  Bell,
  Megaphone,
  Moon,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  Download,
  Check,
  type LucideIcon,
} from "lucide-react";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
          checked ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/profile", label: "Keamanan Akun", icon: ShieldCheck },
  { href: "/services", label: "Bantuan & Dukungan", icon: HelpCircle },
];

export default function SettingsPage() {
  const { showToast } = useToast();
  const { resolvedTheme, setTheme } = useTheme();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);

  const handleInstall = async () => {
    if (installed) return;
    if (canInstall) {
      const ok = await promptInstall();
      if (ok) showToast("Aplikasi terpasang 🎉", "success");
    } else {
      showToast(
        'Buka menu browser, lalu pilih "Add to Home Screen".',
        "info"
      );
    }
  };

  const onToggle = (setter: (v: boolean) => void) => (value: boolean) => {
    setter(value);
    showToast("Preferensi disimpan.", "success");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted">Atur preferensi aplikasimu</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Notifikasi</h2>
        <Card padding="none" className="divide-y divide-border/60 overflow-hidden">
          <ToggleRow
            icon={Bell}
            label="Notifikasi Push"
            description="Peringatan perangkat, energi, dan tagihan"
            checked={pushEnabled}
            onChange={onToggle(setPushEnabled)}
          />
          <ToggleRow
            icon={Megaphone}
            label="Promosi & Penawaran"
            description="Info produk dan diskon partner"
            checked={promoEnabled}
            onChange={onToggle(setPromoEnabled)}
          />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Tampilan</h2>
        <Card padding="none" className="divide-y divide-border/60 overflow-hidden">
          <ToggleRow
            icon={Moon}
            label="Mode Gelap"
            description="Kurangi cahaya layar, nyaman di malam hari"
            checked={resolvedTheme === "dark"}
            onChange={(v) => {
              setTheme(v ? "dark" : "light");
              showToast(v ? "Mode gelap aktif." : "Mode terang aktif.", "success");
            }}
          />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Lainnya</h2>
        <Card padding="none" className="divide-y divide-border/60 overflow-hidden">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-background transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Aplikasi</h2>
        <Card padding="none" className="divide-y divide-border/60 overflow-hidden">
          <button
            onClick={handleInstall}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-background"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              {installed ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <Download className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {installed ? "Aplikasi terpasang" : "Install aplikasi"}
              </p>
              <p className="text-xs text-muted">
                Akses SATU ATAP seperti aplikasi native, bahkan offline
              </p>
            </div>
            {!installed && <ChevronRight className="h-4 w-4 text-muted" />}
          </button>
        </Card>
      </section>

      <p className="text-center text-xs text-muted">SATU ATAP · Versi 0.1.0 (Phase 1)</p>
    </div>
  );
}

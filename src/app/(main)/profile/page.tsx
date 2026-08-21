"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { householdService } from "@/services/household.service";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/hooks/useToast";
import {
  Settings,
  Home as HomeIcon,
  Bell,
  ChevronRight,
  LogOut,
  Users,
  Gift,
  Repeat,
  Building2,
} from "lucide-react";
import type { HouseholdMember, HouseholdRole } from "@/types";

const roleLabels: Record<HouseholdRole, string> = {
  owner: "Pemilik",
  admin: "Admin",
  member: "Anggota",
  guest: "Tamu",
  limited: "Terbatas",
};

const menu = [
  { href: "/household", label: "Anggota Rumah", icon: Users },
  { href: "/homes", label: "Kelola Rumah", icon: HomeIcon },
  { href: "/rewards", label: "Poin & Reward", icon: Gift },
  { href: "/subscriptions", label: "Langganan", icon: Repeat },
  { href: "/building", label: "Gedung", icon: Building2 },
  { href: "/settings", label: "Pengaturan", icon: Settings },
  { href: "/notifications", label: "Notifikasi", icon: Bell },
];

export default function ProfilePage() {
  const { user, session, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const homeId = session?.selectedHomeId || "home-1";
    householdService.getMembers(homeId).then((res) => {
      if (res.success && res.data) setMembers(res.data);
      setLoading(false);
    });
  }, [session?.selectedHomeId]);

  const handleLogout = () => {
    logout();
    showToast("Kamu telah keluar.", "info");
    router.replace("/login");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-xl font-bold">Profil</h1>

      <Card padding="lg" className="flex items-center gap-4">
        <Avatar
          name={user?.fullName || "User"}
          src={user?.avatarUrl}
          size="lg"
        />
        <div className="min-w-0">
          <p className="text-base font-semibold truncate">{user?.fullName}</p>
          <p className="text-sm text-muted truncate">{user?.email}</p>
          <p className="text-xs text-muted mt-0.5">{user?.phone}</p>
        </div>
      </Card>

      <Card
        padding="none"
        className="divide-y divide-border/60 overflow-hidden"
      >
        {menu.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
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

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Anggota Rumah</h2>
        {loading ? (
          <CardSkeleton />
        ) : (
          <Card
            padding="none"
            className="divide-y divide-border/60 overflow-hidden"
          >
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={m.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted truncate">{m.email}</p>
                </div>
                <Badge variant={m.role === "owner" ? "secondary" : "default"}>
                  {roleLabels[m.role]}
                </Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <Button
        variant="outline"
        className="w-full gap-2 text-error"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </Button>
    </div>
  );
}

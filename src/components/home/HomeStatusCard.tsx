import { Card } from "@/components/ui/Card";
import { cn, formatNumber } from "@/lib/utils";
import { Home as HomeIcon, Zap, Droplets, Cpu } from "lucide-react";

interface HomeStatusCardProps {
  homeName: string;
  statusMessage: string;
  devicesOnline: number;
  activeRooms: number;
  className?: string;
}

export function HomeStatusCard({
  homeName,
  statusMessage,
  devicesOnline,
  activeRooms,
  className,
}: HomeStatusCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl">
          🏠
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{homeName}</h2>
          <p className="text-sm text-success font-medium mt-0.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
            {statusMessage}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-muted">
            <span>{devicesOnline} perangkat online</span>
            <span>{activeRooms} ruangan aktif</span>
          </div>
        </div>
        <HomeIcon className="h-5 w-5 text-muted shrink-0" aria-hidden />
      </div>
    </Card>
  );
}

interface DashboardHeroProps {
  greeting: string;
  homeName: string;
  statusMessage: string;
  statusType?: "normal" | "warning" | "error";
  energyKwh: number;
  waterLiters: number;
  devicesOnline: number;
  devicesOffline: number;
}

export function DashboardHero({
  greeting,
  homeName,
  statusMessage,
  statusType = "normal",
  energyKwh,
  waterLiters,
  devicesOnline,
  devicesOffline,
}: DashboardHeroProps) {
  const dot = {
    normal: "bg-emerald-300",
    warning: "bg-amber-300",
    error: "bg-red-300",
  }[statusType];

  return (
    <div className="relative overflow-hidden rounded-hero bg-gradient-to-br from-primary via-primary to-primary-hover p-5 lg:p-6 text-primary-foreground shadow-floating animate-pop-in">
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -left-8 -bottom-10 h-32 w-32 rounded-full bg-secondary/30 blur-2xl"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold">{greeting}</h1>
          <p className="text-sm text-primary-foreground/80 mt-0.5 truncate">
            {homeName}
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
            <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
            {statusMessage}
          </span>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur-sm">
          🏠
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-2.5">
        <HeroMetric
          icon={<Zap className="h-4 w-4" />}
          value={formatNumber(energyKwh, 2)}
          unit="kWh"
          label="Listrik hari ini"
        />
        <HeroMetric
          icon={<Droplets className="h-4 w-4" />}
          value={formatNumber(waterLiters)}
          unit="L"
          label="Air hari ini"
        />
        <HeroMetric
          icon={<Cpu className="h-4 w-4" />}
          value={`${devicesOnline}`}
          unit={`/${devicesOnline + devicesOffline}`}
          label="Perangkat online"
        />
      </div>
    </div>
  );
}

function HeroMetric({
  icon,
  value,
  unit,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5">
      <div className="text-primary-foreground/90">{icon}</div>
      <p className="mt-1.5 text-lg font-bold leading-none">
        {value}
        <span className="ml-0.5 text-xs font-medium text-primary-foreground/70">
          {unit}
        </span>
      </p>
      <p className="mt-1 text-[10px] text-primary-foreground/70">{label}</p>
    </div>
  );
}

interface DashboardGreetingProps {
  greeting: string;
  homeName: string;
  statusMessage: string;
  statusType?: "normal" | "warning" | "error";
}

export function DashboardGreeting({
  greeting,
  homeName,
  statusMessage,
  statusType = "normal",
}: DashboardGreetingProps) {
  const statusColors = {
    normal: "text-success",
    warning: "text-warning",
    error: "text-error",
  };

  return (
    <div className="space-y-1">
      <h1 className="text-xl lg:text-2xl font-bold">{greeting}</h1>
      <p className="text-sm text-muted">{homeName}</p>
      <p className={cn("text-sm font-medium flex items-center gap-1.5", statusColors[statusType])}>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            statusType === "normal" && "bg-success",
            statusType === "warning" && "bg-warning",
            statusType === "error" && "bg-error"
          )}
          aria-hidden
        />
        {statusMessage}
      </p>
    </div>
  );
}

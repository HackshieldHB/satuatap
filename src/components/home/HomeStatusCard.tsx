import { Card } from "@/components/ui/Card";
import { cn, formatNumber } from "@/lib/utils";
import { Home as HomeIcon, Zap, Droplets, Wifi, Thermometer, MapPin } from "lucide-react";

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
}

export function DashboardHero({
  greeting,
  homeName,
  statusMessage,
  statusType = "normal",
}: DashboardHeroProps) {
  const dot = {
    normal: "bg-emerald-300",
    warning: "bg-amber-300",
    error: "bg-red-300",
  }[statusType];

  return (
    <div className="relative flex min-h-[184px] flex-col justify-between overflow-hidden rounded-hero p-6 text-white shadow-floating animate-pop-in lg:min-h-[212px] lg:p-8">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/16-apartment-exterior.png')" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(18,46,44,0.9) 0%, rgba(31,95,91,0.55) 48%, rgba(79,150,144,0.28) 100%)",
        }}
        aria-hidden
      />

      <div className="relative flex justify-end">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {homeName}
        </span>
      </div>

      <div className="relative">
        <h1 className="text-2xl font-bold lg:text-[1.9rem]">{greeting}</h1>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
          {statusMessage}
        </span>
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  energyKwh: number;
  waterLiters: number;
  devicesOnline: number;
  devicesOffline: number;
  temperature?: number;
}

/** Reference-style KPI row: 4 warm cards with a coloured icon chip. */
export function DashboardStats({
  energyKwh,
  waterLiters,
  devicesOnline,
  devicesOffline,
  temperature,
}: DashboardStatsProps) {
  const total = devicesOnline + devicesOffline;
  const onlinePct = total > 0 ? Math.round((devicesOnline / total) * 100) : 0;

  const stats = [
    {
      icon: Wifi,
      chip: "bg-success/15 text-success",
      value: `${devicesOnline}/${total}`,
      unit: `· ${onlinePct}%`,
      label: "Perangkat online",
    },
    {
      icon: Zap,
      chip: "bg-warning/15 text-warning",
      value: formatNumber(energyKwh, 2),
      unit: "kWh",
      label: "Listrik hari ini",
    },
    {
      icon: Droplets,
      chip: "bg-info/15 text-info",
      value: formatNumber(waterLiters),
      unit: "L",
      label: "Air hari ini",
    },
    {
      icon: Thermometer,
      chip: "bg-secondary/15 text-secondary",
      value: typeof temperature === "number" ? temperature.toFixed(0) : "—",
      unit: "°C",
      label: "Suhu ruang",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} padding="md" interactive className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              s.chip
            )}
          >
            <s.icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none text-foreground">
              {s.value}
              <span className="ml-1 text-xs font-medium text-muted">{s.unit}</span>
            </p>
            <p className="mt-1 truncate text-xs text-muted">{s.label}</p>
          </div>
        </Card>
      ))}
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

import Link from "next/link";
import {
  Lightbulb,
  Zap,
  Droplets,
  Bot,
  Shield,
  Home,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuickAction } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  lightbulb: Lightbulb,
  zap: Zap,
  droplets: Droplets,
  bot: Bot,
  shield: Shield,
  home: Home,
};

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-base font-semibold">Aksi Cepat</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {actions.map((action, i) => {
          const Icon = iconMap[action.icon] || Home;
          return (
            <Link
              key={action.id}
              href={action.href}
              style={{ animationDelay: `${i * 50}ms` }}
              className="group flex shrink-0 flex-col items-center gap-2 rounded-lg border border-border/50 bg-surface p-4 min-w-[88px] shadow-card transition-all duration-200 animate-pop-in hover:-translate-y-1 hover:shadow-floating active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/15">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <span className="text-xs font-medium text-center">{action.label}</span>
              {action.status && (
                <span className="text-[10px] text-muted">{action.status}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function QuickActionCard({
  icon: Icon,
  label,
  status,
  href,
}: {
  icon: LucideIcon;
  label: string;
  status?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-surface p-4 shadow-card"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-xs font-medium">{label}</span>
      {status && <span className="text-[10px] text-muted">{status}</span>}
    </Link>
  );
}

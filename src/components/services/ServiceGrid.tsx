import Link from "next/link";
import {
  Zap,
  Droplets,
  Wifi,
  Receipt,
  Smartphone,
  ShoppingCart,
  ShoppingBag,
  Building2,
  Bot,
  Package,
  Gift,
  Repeat,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceCategory } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  droplets: Droplets,
  wifi: Wifi,
  receipt: Receipt,
  smartphone: Smartphone,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  building: Building2,
  bot: Bot,
  package: Package,
  gift: Gift,
  repeat: Repeat,
  "bar-chart": BarChart3,
};

interface ServiceGridProps {
  categories: ServiceCategory[];
}

export function ServiceGrid({ categories }: ServiceGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((cat) => {
        const Icon = iconMap[cat.icon] || Zap;
        return (
          <Link
            key={cat.id}
            href={cat.href}
            className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-surface p-4 shadow-card hover:shadow-floating transition-all duration-200 text-center"
          >
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", cat.color)}>
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold">{cat.label}</p>
              <p className="text-xs text-muted mt-0.5">{cat.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

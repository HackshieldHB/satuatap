import {
  Sofa,
  BedDouble,
  CookingPot,
  ShowerHead,
  Car,
  Trees,
  DoorOpen,
  type LucideIcon,
} from "lucide-react";

export interface RoomVisual {
  icon: LucideIcon;
  /** Tailwind bg + text classes for the icon chip. */
  color: string;
  /** Soft gradient used for hero / header backdrops. */
  gradient: string;
  emoji: string;
}

const rules: {
  match: string[];
  icon: LucideIcon;
  color: string;
  gradient: string;
  emoji: string;
}[] = [
  {
    match: ["tamu", "keluarga", "living"],
    icon: Sofa,
    color: "bg-primary/10 text-primary",
    gradient: "from-primary/15 to-accent/15",
    emoji: "🛋️",
  },
  {
    match: ["tidur", "bedroom", "kamar tidur"],
    icon: BedDouble,
    color: "bg-secondary/10 text-secondary",
    gradient: "from-secondary/15 to-info/15",
    emoji: "🛏️",
  },
  {
    match: ["dapur", "kitchen"],
    icon: CookingPot,
    color: "bg-warning/10 text-warning",
    gradient: "from-warning/15 to-primary/15",
    emoji: "🍳",
  },
  {
    match: ["mandi", "toilet", "bath"],
    icon: ShowerHead,
    color: "bg-info/10 text-info",
    gradient: "from-info/15 to-secondary/15",
    emoji: "🚿",
  },
  {
    match: ["garasi", "garage", "parkir"],
    icon: Car,
    color: "bg-foreground/10 text-foreground",
    gradient: "from-foreground/10 to-muted/10",
    emoji: "🚗",
  },
  {
    match: ["teras", "taman", "garden", "balkon"],
    icon: Trees,
    color: "bg-success/10 text-success",
    gradient: "from-success/15 to-secondary/15",
    emoji: "🌿",
  },
];

export function getRoomVisual(name: string): RoomVisual {
  const n = name.toLowerCase();
  for (const rule of rules) {
    if (rule.match.some((m) => n.includes(m))) {
      const { icon, color, gradient, emoji } = rule;
      return { icon, color, gradient, emoji };
    }
  }
  return {
    icon: DoorOpen,
    color: "bg-muted/10 text-muted",
    gradient: "from-muted/10 to-border/40",
    emoji: "🚪",
  };
}

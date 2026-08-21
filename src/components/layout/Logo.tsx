import Link from "next/link";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const sizes = {
  sm: { text: "text-base", box: "h-7 w-7", icon: "h-4 w-4" },
  md: { text: "text-xl", box: "h-9 w-9", icon: "h-5 w-5" },
  lg: { text: "text-2xl", box: "h-11 w-11", icon: "h-6 w-6" },
};

export function Logo({ size = "md", showTagline, className }: LogoProps) {
  const s = sizes[size];
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2", className)}
      aria-label="SATU ATAP"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-card",
          "transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6",
          s.box
        )}
      >
        <Home className={cn("transition-transform group-hover:scale-110", s.icon)} />
      </span>
      <span className="inline-flex flex-col leading-tight">
        <span
          className={cn(
            "font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent",
            s.text
          )}
        >
          SATU ATAP
        </span>
        {showTagline && (
          <span className="text-xs text-muted mt-0.5">
            Satu atap, semua terkendali.
          </span>
        )}
      </span>
    </Link>
  );
}

export function HomeIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      aria-hidden
    >
      <div className="relative h-32 w-32">
        <div className="absolute inset-0 rounded-hero bg-gradient-to-br from-primary/20 to-secondary/20 animate-float" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-12 bg-primary/30 rounded-t-lg rounded-b-sm" />
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-20 h-14 bg-primary/40 rounded-t-xl" />
        <div className="absolute top-6 right-4 h-3 w-3 rounded-full bg-accent animate-pulse" />
        <div className="absolute top-10 left-6 h-2 w-2 rounded-full bg-secondary/60 animate-pulse" />
      </div>
    </div>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

// Brand assets live in /public/brand (generated from the official logo pack):
//   logo-horizontal.png       mark + dark-green wordmark (light surfaces)
//   logo-horizontal-dark.png  same, wordmark recoloured light (dark surfaces)
//   logo-mark.png             the roof mark alone
// The wordmark swaps via the `.brand-logo-*` rules in globals.css, which also
// keep the light version inside forced-light panels (`data-surface="light"`).
const MARK_SRC = "/brand/logo-mark.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  /** "full" = mark + wordmark; "mark" = roof mark only (compact slots). */
  variant?: "full" | "mark";
  /** Force a tone instead of following the theme (e.g. over a dark photo). */
  tone?: "auto" | "light" | "dark";
  className?: string;
}

const sizes = {
  sm: { full: "h-7", mark: "h-7" },
  md: { full: "h-9", mark: "h-9" },
  lg: { full: "h-12", mark: "h-11" },
};

export function Logo({
  size = "md",
  showTagline,
  variant = "full",
  tone = "auto",
  className,
}: LogoProps) {
  const s = sizes[size];
  const img = "w-auto select-none transition-transform duration-300 group-hover:scale-[1.03]";
  return (
    <Link
      href="/"
      className={cn("group inline-flex flex-col gap-1", className)}
      aria-label="SATU ATAP — Beranda"
    >
      {variant === "mark" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={MARK_SRC} alt="SATU ATAP" className={cn(img, s.mark)} draggable={false} />
      ) : (
        <>
          {tone !== "dark" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand/logo-horizontal.png"
              alt="SATU ATAP"
              className={cn(img, s.full, tone === "auto" && "brand-logo-light")}
              draggable={false}
            />
          )}
          {tone !== "light" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand/logo-horizontal-dark.png"
              alt={tone === "dark" ? "SATU ATAP" : ""}
              aria-hidden={tone === "auto" || undefined}
              className={cn(img, s.full, tone === "auto" && "brand-logo-dark")}
              draggable={false}
            />
          )}
        </>
      )}
      {showTagline && (
        <span className="text-xs text-muted">Satu atap, semua terkendali.</span>
      )}
    </Link>
  );
}

/** The roof mark as a nav icon — drop-in for a lucide icon (`className` sizes it). */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={MARK_SRC}
      alt=""
      aria-hidden
      className={cn("object-contain select-none", className)}
      draggable={false}
    />
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

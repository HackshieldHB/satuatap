import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outline" | "ai";
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg bg-surface",
        variant === "default" && "shadow-card border border-border/50",
        variant === "elevated" && "shadow-floating",
        variant === "outline" && "border border-border",
        variant === "ai" && "ai-gradient border border-secondary/20 shadow-card",
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = "Card";

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)} {...props} />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

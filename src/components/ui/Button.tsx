import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  isSuccess?: boolean;
}

const variants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary-hover active:scale-[0.98]",
  outline:
    "border border-border bg-surface text-foreground hover:bg-background active:scale-[0.98]",
  ghost: "text-foreground hover:bg-background active:scale-[0.98]",
  danger: "bg-error text-white hover:bg-error/90 active:scale-[0.98]",
};

const sizes = {
  sm: "h-9 px-3 text-sm rounded-md gap-1.5",
  md: "h-11 px-5 text-sm rounded-md gap-2",
  lg: "h-12 px-6 text-base rounded-md gap-2",
  icon: "h-11 w-11 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      isSuccess,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading || isSuccess}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {isSuccess ? "Berhasil ✓" : children}
    </button>
  )
);

Button.displayName = "Button";

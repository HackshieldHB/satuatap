import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${label.toLowerCase().replace(/\s/g, "-")}`;

    return (
      <label
        htmlFor={checkboxId}
        className={cn("flex items-start gap-3 cursor-pointer group", className)}
      >
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          {...props}
        />
        <span className="text-sm text-muted group-hover:text-foreground transition-colors">
          {label}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

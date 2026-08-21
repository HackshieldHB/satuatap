import { cn } from "@/lib/utils";
import { Search as SearchIcon } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";

interface SearchProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(
  ({ className, placeholder = "Cari...", ...props }, ref) => (
    <div className="relative">
      <SearchIcon
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className={cn(
          "flex h-11 w-full rounded-md border border-border bg-surface pl-10 pr-4 text-sm",
          "placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          className
        )}
        {...props}
      />
    </div>
  )
);

Search.displayName = "Search";

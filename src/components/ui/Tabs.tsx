"use client";

import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn("flex gap-1 overflow-x-auto scrollbar-hide border-b border-border", className)}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px touch-target",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

interface SegmentedControlProps {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md bg-background p-1 gap-0.5",
        className
      )}
      role="group"
    >
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 touch-target",
            value === option.id
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

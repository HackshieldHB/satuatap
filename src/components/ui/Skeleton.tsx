import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("rounded-md skeleton-shimmer", className)}
      aria-hidden
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-24 shrink-0 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <CardSkeleton />
    </div>
  );
}

export function DeviceListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border/50 bg-surface p-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BannerSkeleton() {
  return <Skeleton className="h-40 w-full rounded-hero" />;
}

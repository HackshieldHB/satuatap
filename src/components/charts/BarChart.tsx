import { cn } from "@/lib/utils";

interface BarChartProps {
  data: { label: string; value: number }[];
  unit?: string;
  /** Tailwind text-color class used for the highlighted (last) bar. */
  colorClass?: string;
  className?: string;
}

const CHART_H = 128;

export function BarChart({
  data,
  unit,
  colorClass = "text-primary",
  className,
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className={cn("flex items-end gap-2", className)}
      style={{ height: CHART_H + 22 }}
    >
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const h = Math.max(6, (d.value / max) * CHART_H);
        return (
          <div
            key={i}
            className="flex flex-1 flex-col items-center justify-end gap-1.5"
          >
            <div
              className={cn(
                "w-full max-w-[26px] rounded-t-md transition-all duration-500",
                isLast ? colorClass : "text-muted"
              )}
              style={{
                height: `${h}px`,
                backgroundColor: "currentColor",
                opacity: isLast ? 1 : 0.3,
              }}
              title={`${d.value}${unit ? " " + unit : ""}`}
            />
            <span className="text-[10px] text-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

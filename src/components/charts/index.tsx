"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line as ReLine,
  BarChart as ReBarChart,
  Bar as ReBar,
  AreaChart,
  Area as ReArea,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

export type ChartPoint = { label: string; value: number };

const PRIMARY = "#FF7A59";
const GRID = "rgb(var(--color-border) / 0.6)";
const TICK = "rgb(var(--color-muted))";

type ChartProps = {
  data: ChartPoint[];
  unit?: string;
  color?: string;
  className?: string;
  height?: number;
};

const tooltipStyle = {
  backgroundColor: "rgb(var(--color-surface))",
  border: "1px solid rgb(var(--color-border))",
  borderRadius: 8,
  color: "rgb(var(--color-foreground))",
  fontSize: 12,
};

export function Line({ data, unit, color = PRIMARY, className, height = 180 }: ChartProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} width={36} unit={unit ? ` ${unit}` : undefined} />
          <Tooltip contentStyle={tooltipStyle} />
          <ReLine type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Bar({ data, unit, color = PRIMARY, className, height = 180 }: ChartProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} width={36} unit={unit ? ` ${unit}` : undefined} />
          <Tooltip contentStyle={tooltipStyle} />
          <ReBar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Area({ data, unit, color = PRIMARY, className, height = 180 }: ChartProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} width={36} unit={unit ? ` ${unit}` : undefined} />
          <Tooltip contentStyle={tooltipStyle} />
          <ReArea type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.18} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChart(props: {
  data: ChartPoint[];
  unit?: string;
  colorClass?: string;
  className?: string;
}) {
  return <Bar data={props.data} unit={props.unit} className={props.className} />;
}

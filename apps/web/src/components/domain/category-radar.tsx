"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils/cn";

export interface CategoryRadarPoint {
  label: string;
  score: number;
}

export interface CategoryRadarProps {
  data: CategoryRadarPoint[];
  size?: number;
  className?: string;
}

/**
 * Pencil Component/CategoryRadar — 6-axis spider chart 280×280. Default Recharts
 * RadarChart with Pencil token styling. A/B variant of CategoryBars for
 * AuditDetail/Completed/AltView.
 */
export function CategoryRadar({ data, size = 280, className }: CategoryRadarProps) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid
            stroke="rgb(var(--color-border))"
            radialLines={true}
          />
          <PolarAngleAxis
            dataKey="label"
            tick={{
              fill: "rgb(var(--color-fg-muted))",
              fontSize: 12,
              fontFamily: "var(--font-ui)",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="rgb(var(--color-primary))"
            fill="rgb(var(--color-primary))"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

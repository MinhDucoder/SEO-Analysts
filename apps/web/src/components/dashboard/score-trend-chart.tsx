"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { buildTrendSeries, type TrendPoint } from "@/lib/dashboard/chart-data";
import type { AuditListItem } from "@/lib/api/types";

/**
 * 30-day line chart of audit scores. Uses Recharts ResponsiveContainer
 * for width = 100%; fixed height 256px. Falls back to an empty-state
 * card when fewer than 2 completed audits exist.
 */
export interface ScoreTrendChartProps {
  audits: AuditListItem[];
  className?: string;
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as TrendPoint | undefined;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 shadow-md">
      <p className="text-caption font-semibold text-on-surface">
        {point.label}
      </p>
      <p className="text-micro text-on-surface-variant truncate max-w-[200px]">
        {point.url}
      </p>
      <p className="text-body-sm font-bold text-primary mt-1 tabular-nums">
        {point.score} điểm
      </p>
    </div>
  );
}

export function ScoreTrendChart({ audits, className }: ScoreTrendChartProps) {
  const series = buildTrendSeries(audits);

  return (
    <Card padding="md" className={className}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-headline text-h4 font-semibold text-on-surface">
            Xu hướng điểm SEO
          </h3>
          <p className="text-caption text-on-surface-variant">
            30 ngày gần nhất
          </p>
        </div>
      </div>

      {series.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Chưa đủ dữ liệu"
          body="Cần ít nhất 2 audit hoàn tất để vẽ xu hướng."
          size="md"
        />
      ) : (
        <div className="h-64 w-full" data-testid="score-trend-chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series}
              margin={{ top: 10, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-surface-container)"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                stroke="rgb(var(--color-on-surface-variant))"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                stroke="rgb(var(--color-on-surface-variant))"
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="rgb(var(--color-primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "rgb(var(--color-primary))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

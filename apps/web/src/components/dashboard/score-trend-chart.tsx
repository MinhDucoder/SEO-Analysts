"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { buildTrendSeries } from "@/lib/dashboard/chart-data";
import type { AuditListItem } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

export interface ScoreTrendChartProps {
  audits: AuditListItem[];
  className?: string;
}

/**
 * Dashboard widget — line chart of SEO score over time (latest completed
 * audit per day). Falls back to a muted "need ≥ 2 audits" placeholder
 * when there aren't enough data points.
 */
export function ScoreTrendChart({ audits, className }: ScoreTrendChartProps) {
  const t = useTranslations("dashboard.trend");
  const series = buildTrendSeries(audits);
  const hasData = series.length >= 2;

  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-ui text-base font-semibold text-fg">{t("title")}</h2>
        <span className="font-ui text-xs text-fg-muted">{t("subtitle")}</span>
      </div>
      <div className="h-56">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgb(var(--color-border))" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgb(var(--color-fg-muted))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="rgb(var(--color-fg-muted))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: "rgb(var(--color-border))" }}
                contentStyle={{
                  background: "rgb(var(--color-bg-elevated))",
                  border: "1px solid rgb(var(--color-border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "rgb(var(--color-fg))" }}
                itemStyle={{ color: "rgb(var(--color-fg))" }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="rgb(var(--color-primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "rgb(var(--color-primary))", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-center font-ui text-sm text-fg-muted">
            {t("needMore")}
          </div>
        )}
      </div>
    </Card>
  );
}

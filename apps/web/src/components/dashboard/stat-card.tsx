"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export interface StatCardProps {
  title: string;
  description?: string;
  /** Numeric value or null for empty/coming-soon states. */
  value: number | null;
  /** Optional delta vs previous window. null = baseline missing. */
  delta?: number | null;
  /** Optional suffix appended after the value (e.g. " /100"). */
  suffix?: string;
  /** Label rendered under the delta pill, e.g. "vs last month". */
  deltaLabel?: string;
  /** Placeholder text when value === null (defaults to "—"). */
  noDataLabel?: string;
  className?: string;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

/**
 * Single-metric dashboard card. Renders title, large numeric value,
 * optional suffix, optional delta pill (ArrowUp/Down/Minus depending on
 * sign), and a description. Null value renders the no-data placeholder.
 */
export function StatCard({
  title,
  description,
  value,
  delta = null,
  suffix,
  deltaLabel,
  noDataLabel = "—",
  className,
}: StatCardProps) {
  const hasValue = value !== null && !Number.isNaN(value);
  const Icon = delta === null ? Minus : delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const deltaColor =
    delta === null || delta === 0
      ? "text-fg-muted"
      : delta > 0
        ? "text-class-excellent"
        : "text-class-poor";

  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <p className="font-ui text-xs font-medium uppercase tracking-wider text-fg-muted">
        {title}
      </p>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-3xl font-bold tabular-nums leading-none",
            hasValue ? "text-fg" : "text-fg-muted",
          )}
        >
          {hasValue ? formatNumber(value as number) : noDataLabel}
        </span>
        {suffix && (
          <span className="font-mono text-sm text-fg-muted">{suffix}</span>
        )}
      </div>
      {(delta !== undefined || description) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          {delta !== undefined && (
            <span className={cn("inline-flex items-center gap-1 font-mono tabular-nums", deltaColor)}>
              <Icon className="h-3 w-3" />
              {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
              {deltaLabel && (
                <span className="text-fg-muted"> {deltaLabel}</span>
              )}
            </span>
          )}
          {description && (
            <span className="text-fg-muted">{description}</span>
          )}
        </div>
      )}
    </Card>
  );
}

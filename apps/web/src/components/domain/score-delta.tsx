import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ScoreDeltaProps {
  /** Difference in score points (e.g. +5.2 or -3.1). */
  delta: number | null;
  /** Number of decimals to show. */
  precision?: number;
  className?: string;
}

/**
 * Pencil Component/ScoreDelta — pill showing score difference vs previous run.
 * Green when up, red when down, muted when zero/null.
 */
export function ScoreDelta({ delta, precision = 1, className }: ScoreDeltaProps) {
  if (delta === null || Number.isNaN(delta)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-bg-overlay px-2.5 py-0.5 font-mono text-xs font-medium text-fg-muted",
          className,
        )}
      >
        <Minus className="h-3 w-3" />—
      </span>
    );
  }

  const up = delta > 0;
  const flat = delta === 0;
  const colorClass = flat
    ? "bg-bg-overlay text-fg-muted"
    : up
      ? "bg-class-excellent/15 text-class-excellent"
      : "bg-class-poor/15 text-class-poor";

  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;
  const sign = up ? "+" : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums",
        colorClass,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {sign}
      {delta.toFixed(precision)}
    </span>
  );
}

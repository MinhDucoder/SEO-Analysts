import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

/**
 * One metric block for the dashboard stats grid. Icon chip + label +
 * big numeric value + optional delta badge. Delta direction colors:
 * up = tertiary (green), down = error (red), flat = on-surface-variant.
 * When `value === null` renders "—" and suppresses delta rendering.
 */
export type StatAccent = "primary" | "tertiary" | "warning" | "error";

export interface StatCardProps {
  label: string;
  value: string | number | null;
  delta?: string | null;
  deltaDirection?: "up" | "down" | "flat";
  icon: LucideIcon;
  accent?: StatAccent;
  /**
   * Optional helper copy shown when `value === null` (e.g. "Chưa đủ dữ liệu"),
   * in place of the delta.
   */
  placeholder?: string;
  className?: string;
}

const ACCENT_CHIP: Record<StatAccent, string> = {
  primary: "bg-primary/10 text-primary",
  tertiary: "bg-tertiary/10 text-tertiary",
  warning: "bg-warning/10 text-warning-foreground",
  error: "bg-error/10 text-error",
};

const DELTA_CLASS: Record<"up" | "down" | "flat", string> = {
  up: "text-tertiary",
  down: "text-error",
  flat: "text-on-surface-variant",
};

const DELTA_ICON = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
} as const;

export function StatCard({
  label,
  value,
  delta,
  deltaDirection = "flat",
  icon: Icon,
  accent = "primary",
  placeholder,
  className,
}: StatCardProps) {
  const isEmpty = value === null || value === undefined;
  const DeltaIcon = DELTA_ICON[deltaDirection];

  return (
    <Card padding="md" className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", ACCENT_CHIP[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        {!isEmpty && delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-caption font-bold",
              DELTA_CLASS[deltaDirection],
            )}
          >
            <DeltaIcon className="h-3.5 w-3.5" />
            <span>{delta}</span>
          </span>
        )}
      </div>

      <p className="text-micro text-on-surface-variant font-bold uppercase tracking-widest">
        {label}
      </p>
      <h4 className="font-headline text-3xl font-extrabold text-on-surface mt-1 tabular-nums">
        {isEmpty ? "—" : value}
      </h4>
      {isEmpty && placeholder && (
        <p className="text-caption text-on-surface-variant/60 mt-1">
          {placeholder}
        </p>
      )}
    </Card>
  );
}

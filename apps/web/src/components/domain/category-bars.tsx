import { cn } from "@/lib/utils/cn";
import { scoreFillVar, scoreVariant } from "@/lib/utils/classify";

export interface CategoryBarRow {
  label: string;
  score: number;
}

export interface CategoryBarsProps {
  rows: CategoryBarRow[];
  className?: string;
}

/**
 * Pencil Component/CategoryBars/Lg — N rows of label + horizontal bar + score.
 * Bar fill width = score / 100 of container, color via classify().
 */
export function CategoryBars({ rows, className }: CategoryBarsProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {rows.map((row, i) => {
        const fill = scoreFillVar(row.score);
        const variant = scoreVariant(row.score);
        return (
          <div key={`${row.label}-${i}`} className="flex items-center gap-4">
            <span className="w-[140px] flex-shrink-0 truncate font-ui text-sm font-medium text-fg-muted">
              {row.label}
            </span>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: "rgb(var(--color-border))" }}
            >
              <div
                className="h-2 rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.max(0, Math.min(100, row.score))}%`,
                  backgroundColor: fill,
                }}
              />
            </div>
            <span
              className="w-12 text-right font-mono text-sm font-semibold tabular-nums"
              style={{ color: variant === "muted" ? "rgb(var(--color-fg))" : fill }}
            >
              {Math.round(row.score)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

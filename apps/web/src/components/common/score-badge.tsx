import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatScore } from "@/lib/utils/format";
import { scoreVariant } from "@/lib/utils/classify";
import { cn } from "@/lib/utils/cn";

/**
 * Score chip (0-100) colored by classification. Used in audit lists,
 * dashboard rows, and comparison tables. Null/undefined renders "—"
 * in a neutral pill so callers do not need to branch on missing scores.
 */
export interface ScoreBadgeProps
  extends Omit<BadgeProps, "children" | "variant"> {
  score: number | null | undefined;
}

const VARIANT_CLASS: Record<string, string> = {
  excellent: "bg-score-excellent/10 text-score-excellent",
  good: "bg-score-good/10 text-score-good",
  fair: "bg-score-fair/10 text-score-fair",
  poor: "bg-score-poor/10 text-score-poor",
  muted: "bg-surface-container text-on-surface-variant",
};

export function ScoreBadge({ score, className, ...rest }: ScoreBadgeProps) {
  const variant = scoreVariant(score);
  return (
    <Badge
      {...rest}
      variant="neutral"
      shape="pill"
      className={cn(
        "font-bold tabular-nums",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {formatScore(score)}
    </Badge>
  );
}

import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { scoreTextClass, scoreVariant } from "@/lib/utils/classify";
import { cn } from "@/lib/utils/cn";

const CIRCUMFERENCE = 2 * Math.PI * 88; // r = 88

/**
 * Website health score hero. Big circular SVG gauge (192×192) with
 * classification-colored stroke, huge score text in the middle, and an
 * optional delta pill below ("+X% so với tháng trước" or "—").
 * Renders neutrally when `score === null` with a "Chưa có audit" label.
 */
export interface ScoreGaugeHeroProps {
  score: number | null;
  previousScore?: number | null;
  className?: string;
}

export function ScoreGaugeHero({
  score,
  previousScore = null,
  className,
}: ScoreGaugeHeroProps) {
  const variant = scoreVariant(score);
  const fillColor = scoreTextClass(score);
  const filledPortion = score === null ? 0 : (score / 100) * CIRCUMFERENCE;
  const dashOffset = CIRCUMFERENCE - filledPortion;

  const delta =
    score !== null && previousScore !== null
      ? Math.round(((score - previousScore) / Math.max(previousScore, 1)) * 100)
      : null;

  return (
    <Card
      variant="elevated"
      padding="lg"
      className={cn(
        "flex flex-col items-center justify-center relative overflow-hidden",
        className,
      )}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-tertiary/5 rounded-full blur-3xl" />

      <h3 className="text-on-surface-variant font-bold text-micro uppercase tracking-widest mb-6">
        Sức khỏe SEO
      </h3>

      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 192 192"
          className="w-48 h-48 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            strokeWidth="12"
            className="text-surface-container"
            stroke="currentColor"
          />
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            className={cn(
              "transition-all duration-1000",
              variant === "muted" ? "text-outline-variant" : fillColor,
            )}
            stroke="currentColor"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span
            className={cn(
              "font-headline text-6xl font-extrabold tracking-tighter tabular-nums",
              score === null ? "text-on-surface-variant" : "text-on-surface",
            )}
          >
            {score ?? "—"}
          </span>
          <span className="text-on-surface-variant/60 font-bold text-body-sm">
            / 100
          </span>
        </div>
      </div>

      <div className="mt-8">
        {delta === null ? (
          <span className="text-caption text-on-surface-variant">
            {score === null
              ? "Chưa có audit hoàn tất"
              : "Chưa đủ dữ liệu so sánh"}
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-caption font-bold",
              delta >= 0
                ? "bg-tertiary/10 text-tertiary"
                : "bg-error/10 text-error",
            )}
          >
            {delta >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>
              {delta >= 0 ? "+" : ""}
              {delta}% so với audit trước
            </span>
          </span>
        )}
      </div>
    </Card>
  );
}

import { cn } from "@/lib/utils/cn";
import { scoreFillVar, scoreVariant } from "@/lib/utils/classify";

export interface ScoreRingProps {
  score: number | null;
  /** Size px. Pencil ScoreRing/Lg = 160. */
  size?: number;
  /** Stroke thickness as % of radius. Default matches Pencil innerRadius 0.7. */
  strokeRatio?: number;
  /** Hide the numeric center (for inline mini variants). */
  hideLabel?: boolean;
  className?: string;
}

/**
 * Pencil ScoreRing/Lg (id=lHEAG) — SVG progress ring 0-100 with classify color
 * + center numeric label. Sweep proceeds clockwise from top (12 o'clock).
 */
export function ScoreRing({
  score,
  size = 160,
  strokeRatio = 0.15,
  hideLabel,
  className,
}: ScoreRingProps) {
  const stroke = size * strokeRatio;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const safeScore = score === null || Number.isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
  const dashOffset = circumference * (1 - safeScore / 100);
  const fill = scoreFillVar(score);
  const variant = scoreVariant(score);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={score === null ? "No score yet" : `Score ${Math.round(safeScore)} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgb(var(--color-border))"
          strokeWidth={stroke}
        />
        {score !== null && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={fill}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        )}
      </svg>
      {!hideLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-5xl font-bold leading-none tabular-nums"
            style={{ color: variant === "muted" ? "rgb(var(--color-fg))" : fill }}
          >
            {score === null ? "—" : Math.round(safeScore)}
          </span>
          <span className="mt-1 font-ui text-xs uppercase tracking-wider text-fg-muted">
            / 100
          </span>
        </div>
      )}
    </div>
  );
}

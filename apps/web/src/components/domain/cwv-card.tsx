import { cn } from "@/lib/utils/cn";

/**
 * Web Vitals thresholds (per design INTENT §6, matches Google guidelines).
 * Values in milliseconds for LCP/FCP/TTFB/INP, unitless for CLS.
 */
const CWV_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  inp: { good: 200, poor: 500 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
} as const;

export type CwvMetricKey = keyof typeof CWV_THRESHOLDS;

function classifyCwv(metric: CwvMetricKey, value: number | null): "good" | "needs" | "poor" | "muted" {
  if (value === null || Number.isNaN(value)) return "muted";
  const t = CWV_THRESHOLDS[metric];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs";
  return "poor";
}

const COLOR_VAR: Record<"good" | "needs" | "poor" | "muted", string> = {
  good: "rgb(var(--color-cwv-good))",
  needs: "rgb(var(--color-cwv-needs-improvement))",
  poor: "rgb(var(--color-cwv-poor))",
  muted: "rgb(var(--color-fg-muted))",
};

const LABELS: Record<CwvMetricKey, string> = {
  lcp: "LCP",
  cls: "CLS",
  inp: "INP",
  fcp: "FCP",
  ttfb: "TTFB",
};

function format(metric: CwvMetricKey, value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (metric === "cls") return value.toFixed(3);
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

export interface CwvCardProps {
  metrics: Partial<Record<CwvMetricKey, number | null>>;
  /** Restrict which metrics to show (default 3 core: LCP/CLS/INP). */
  show?: CwvMetricKey[];
  className?: string;
}

/**
 * Pencil Component/CwvCard — 3 (or N) Core Web Vitals metrics inline in a card,
 * each colored by Google threshold (good/needs-improvement/poor).
 */
export function CwvCard({ metrics, show = ["lcp", "cls", "inp"], className }: CwvCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-bg-elevated p-6",
        className,
      )}
    >
      <h3 className="mb-4 font-ui text-lg font-semibold text-fg">Core Web Vitals</h3>
      <div className="flex flex-wrap gap-6">
        {show.map((key) => {
          const v = metrics[key] ?? null;
          const variant = classifyCwv(key, v);
          const color = COLOR_VAR[variant];
          return (
            <div key={key} className="flex flex-col gap-1">
              <span className="font-ui text-xs uppercase tracking-wider text-fg-muted">
                {LABELS[key]}
              </span>
              <span
                className="font-mono text-2xl font-semibold tabular-nums"
                style={{ color: variant === "muted" ? "rgb(var(--color-fg))" : color }}
              >
                {format(key, v)}
              </span>
              <span
                className="font-ui text-xs"
                style={{ color: variant === "muted" ? "rgb(var(--color-fg-muted))" : color }}
              >
                {variant === "good" && "Good"}
                {variant === "needs" && "Needs improvement"}
                {variant === "poor" && "Poor"}
                {variant === "muted" && "No data"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

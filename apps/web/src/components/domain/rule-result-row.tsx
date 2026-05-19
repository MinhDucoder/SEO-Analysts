"use client";

import * as React from "react";
import { CheckCircle2, ChevronDown, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type RuleStatus = "pass" | "fail" | "warn" | "skipped";

export interface RuleResultRowProps {
  name: string;
  status: RuleStatus;
  /** Weight of this rule (e.g. 5, 10) — shown as a pill. */
  weight?: number;
  /** Optional explainer body shown when expanded. */
  detail?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const STATUS_META: Record<
  RuleStatus,
  { Icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  pass: { Icon: CheckCircle2, color: "text-class-excellent", label: "Pass" },
  fail: { Icon: XCircle, color: "text-class-poor", label: "Fail" },
  warn: { Icon: AlertTriangle, color: "text-class-fair", label: "Warn" },
  skipped: { Icon: AlertTriangle, color: "text-fg-muted", label: "Skipped" },
};

/**
 * Pencil Component/RuleResultRow — collapsible row showing rule status icon +
 * name + weight + chevron toggle. Detail body shown when expanded.
 */
export function RuleResultRow({
  name,
  status,
  weight,
  detail,
  defaultOpen = false,
  className,
}: RuleResultRowProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const { Icon, color, label } = STATUS_META[status];
  const hasDetail = !!detail;

  return (
    <div className={cn("rounded-md border border-border bg-bg-elevated", className)}>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        disabled={!hasDetail}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          hasDetail && "hover:bg-bg-overlay",
          !hasDetail && "cursor-default",
        )}
        aria-expanded={hasDetail ? open : undefined}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", color)} aria-label={label} />
        <span className="flex-1 font-ui text-sm font-medium text-fg">{name}</span>
        {typeof weight === "number" && (
          <span className="rounded-full bg-bg-overlay px-2 py-0.5 font-mono text-xs text-fg-muted">
            ×{weight}
          </span>
        )}
        {hasDetail && (
          <ChevronDown
            className={cn(
              "h-4 w-4 flex-shrink-0 text-fg-muted transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      {open && hasDetail && (
        <div className="border-t border-border px-4 py-3 font-ui text-sm text-fg-muted">
          {detail}
        </div>
      )}
    </div>
  );
}

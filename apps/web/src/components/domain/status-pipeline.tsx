import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type PipelineStepStatus = "done" | "active" | "pending" | "failed";

export interface PipelineStep {
  key: string;
  label: string;
  status: PipelineStepStatus;
}

export interface StatusPipelineProps {
  steps: PipelineStep[];
  className?: string;
}

const STEP_STYLE: Record<PipelineStepStatus, { dot: string; label: string }> = {
  done: { dot: "bg-class-excellent text-bg", label: "text-fg" },
  active: { dot: "bg-status-active text-bg animate-pulse", label: "text-fg font-semibold" },
  pending: { dot: "bg-bg-overlay text-fg-muted", label: "text-fg-muted" },
  failed: { dot: "bg-class-poor text-bg", label: "text-class-poor font-semibold" },
};

/**
 * Pencil Component/StatusPipeline — horizontal stepper showing audit pipeline
 * stages. Used by AuditDetail/InProgress states: crawling → analyzing → reporting.
 */
export function StatusPipeline({ steps, className }: StatusPipelineProps) {
  return (
    <ol className={cn("flex items-center gap-2", className)} aria-label="Audit pipeline progress">
      {steps.map((step, i) => {
        const style = STEP_STYLE[step.status];
        const isLast = i === steps.length - 1;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                style.dot,
              )}
              aria-label={`Step ${i + 1} ${step.status}`}
            >
              {step.status === "done" && <Check className="h-4 w-4" />}
              {step.status === "active" && <Loader2 className="h-4 w-4 animate-spin" />}
              {step.status === "pending" && i + 1}
              {step.status === "failed" && "!"}
            </div>
            <span className={cn("font-ui text-sm whitespace-nowrap", style.label)}>
              {step.label}
            </span>
            {!isLast && (
              <span
                className={cn(
                  "h-px flex-1 min-w-[16px]",
                  step.status === "done" ? "bg-class-excellent" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

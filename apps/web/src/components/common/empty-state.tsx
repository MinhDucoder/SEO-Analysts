import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Generic empty-state block. Icon + title + body copy + CTA slot.
 * Used across widgets and page-level empties so the copy shape stays
 * consistent.
 */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
  /** Padding variant. Page-level uses `p-16 text-center`; inline widgets use `p-8`. */
  size?: "md" | "lg";
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        size === "lg" ? "gap-5 py-16" : "gap-3 py-8",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center",
            size === "lg" ? "h-20 w-20" : "h-12 w-12",
          )}
        >
          <Icon className={size === "lg" ? "h-10 w-10" : "h-6 w-6"} />
        </div>
      )}
      <div className="space-y-1 max-w-md">
        <h3
          className={cn(
            "font-headline font-semibold text-on-surface",
            size === "lg" ? "text-h3" : "text-h4",
          )}
        >
          {title}
        </h3>
        {body && (
          <p className="text-body-sm text-on-surface-variant">{body}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

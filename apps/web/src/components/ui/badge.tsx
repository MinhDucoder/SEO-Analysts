import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        success: "border-transparent bg-class-excellent/15 text-class-excellent",
        warn: "border-transparent bg-class-fair/15 text-class-fair",
        error: "border-transparent bg-class-poor/15 text-class-poor",
        info: "border-transparent bg-status-active/15 text-status-active",
        muted: "border-border bg-bg-overlay text-fg-muted",
      },
    },
    defaultVariants: { variant: "muted" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

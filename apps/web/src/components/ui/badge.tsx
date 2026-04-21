import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-primary-fixed text-primary",
        success: "bg-tertiary-fixed text-tertiary",
        warning: "bg-warning-container text-warning-foreground",
        error: "bg-error-container text-error",
        neutral: "bg-surface-container text-on-surface-variant",
      },
      shape: {
        pill: "rounded-full",
        square: "rounded",
      },
      size: {
        sm: "h-5 px-2 text-micro",
        md: "h-6 px-2.5 text-caption",
        lg: "h-7 px-3 text-body-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      shape: "pill",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, shape, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, shape, size }), className)} {...props} />
  );
}

export { badgeVariants };

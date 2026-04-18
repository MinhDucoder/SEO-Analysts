import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={error || undefined}
        className={cn(
          "flex h-10 w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-body-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-body-sm file:font-medium",
          "placeholder:text-on-surface-variant/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-error focus-visible:ring-error"
            : "border-outline-variant",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

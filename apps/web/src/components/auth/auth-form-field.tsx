"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

interface AuthFormFieldProps extends Omit<InputProps, "id"> {
  id: string;
  label: string;
  error?: string;
  /** Whether to render eye toggle for password fields. */
  withPasswordToggle?: boolean;
}

/**
 * Labeled input row used across auth pages. Renders error below input when
 * provided. Password fields gain an eye-toggle to reveal/hide the value.
 */
export const AuthFormField = React.forwardRef<HTMLInputElement, AuthFormFieldProps>(
  ({ id, label, error, withPasswordToggle, className, type = "text", ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const effectiveType = withPasswordToggle ? (visible ? "text" : "password") : type;
    const errId = error ? `${id}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <Input
            id={id}
            ref={ref}
            type={effectiveType}
            aria-invalid={!!error}
            aria-describedby={errId}
            className={cn(
              withPasswordToggle && "pr-10",
              error && "border-class-poor focus-visible:ring-class-poor",
              className,
            )}
            {...props}
          />
          {withPasswordToggle && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              tabIndex={-1}
              aria-label={visible ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-muted transition-colors hover:text-fg"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && (
          <p id={errId} className="font-ui text-xs text-class-poor">
            {error}
          </p>
        )}
      </div>
    );
  },
);
AuthFormField.displayName = "AuthFormField";

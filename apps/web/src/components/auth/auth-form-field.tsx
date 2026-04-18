"use client";

import * as React from "react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

export interface AuthFormFieldProps<T extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "form"> {
  name: Path<T>;
  label: string;
  hint?: string;
}

/**
 * RHF-wired Label + Input + error message. Must be rendered inside a
 * <FormProvider> (or a parent using useForm with its methods hoisted).
 */
export function AuthFormField<T extends FieldValues>({
  name,
  label,
  hint,
  className,
  ...rest
}: AuthFormFieldProps<T>) {
  const form = useFormContext<T>();
  const error = form.formState.errors[name]?.message as string | undefined;
  const id = `field-${String(name)}`;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        error={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...form.register(name)}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="text-caption text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-caption text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

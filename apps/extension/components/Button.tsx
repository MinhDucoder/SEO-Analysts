import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

interface ButtonClassArgs {
  variant: ButtonVariant;
  size: ButtonSize;
  loading?: boolean;
}

/** Pure className builder — testable without DOM. */
export function buttonClassName({ variant, size, loading }: ButtonClassArgs): string {
  return [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading ? 'btn-loading' : '',
  ].filter(Boolean).join(' ');
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const base = buttonClassName({ variant, size, loading });
  const merged = className ? `${base} ${className}` : base;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={merged}
    >
      {loading && <span className="btn-spinner" aria-hidden />}
      <span>{children}</span>
    </button>
  );
}

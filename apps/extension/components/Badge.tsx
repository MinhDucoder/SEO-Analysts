import type { ReactNode } from 'react';

export type BadgeVariant = 'env' | 'cached' | 'severity' | 'meta';
export type BadgeTone =
  | 'live' | 'test'
  | 'success' | 'warning' | 'error' | 'info'
  | 'neutral';

/** Pure className builder — testable without DOM. */
export function badgeClassName(variant: BadgeVariant, tone: BadgeTone = 'neutral'): string {
  return `badge badge-${variant} badge-${tone}`;
}

interface BadgeProps {
  variant: BadgeVariant;
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ variant, tone, children }: BadgeProps) {
  return <span className={badgeClassName(variant, tone)}>{children}</span>;
}

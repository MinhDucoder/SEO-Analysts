/**
 * Shared inline-style constants for components. Every value pulls
 * from a CSS variable defined in `lib/tokens.ts` so light/dark theme
 * follows the document's `data-theme` attribute (or system preference).
 *
 * Inline styles keep us free of Tailwind/shadcn per project policy.
 */
import type { CSSProperties } from 'react';
import type { IssueSeverity } from '../api-types';

export const text = {
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  tertiary: 'var(--text-tertiary)',
  inverse: 'var(--text-inverse)',
} as const;

export const bg = {
  canvas: 'var(--bg-canvas)',
  surface: 'var(--bg-surface)',
  subtle: 'var(--bg-subtle)',
  muted: 'var(--bg-muted)',
} as const;

export const border = {
  default: 'var(--border-default)',
  strong: 'var(--border-strong)',
} as const;

export const accent = {
  primary: 'var(--accent-primary)',
  onPrimary: 'var(--accent-on-primary)',
} as const;

export const sev = {
  error: 'var(--sev-error)',
  errorBg: 'var(--sev-error-bg)',
  warning: 'var(--sev-warning)',
  warningBg: 'var(--sev-warning-bg)',
  info: 'var(--sev-info)',
  infoBg: 'var(--sev-info-bg)',
  success: 'var(--sev-success)',
  successBg: 'var(--sev-success-bg)',
} as const;

export function severityColor(s: IssueSeverity): string {
  return s === 'error' ? sev.error : s === 'warning' ? sev.warning : sev.info;
}

export function scoreColor(score: number): string {
  return score >= 80 ? sev.success : score >= 60 ? sev.warning : sev.error;
}

export const btn = {
  primary: {
    padding: '6px 12px',
    background: accent.primary,
    color: accent.onPrimary,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--fs-base)',
    fontWeight: 500,
    cursor: 'pointer',
  } satisfies CSSProperties,
  secondary: {
    padding: '6px 12px',
    background: bg.subtle,
    color: text.primary,
    border: `1px solid ${border.default}`,
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--fs-base)',
    fontWeight: 500,
    cursor: 'pointer',
  } satisfies CSSProperties,
  ghost: {
    background: 'transparent',
    border: 'none',
    color: text.secondary,
    cursor: 'pointer',
    fontSize: 'var(--fs-sm)',
    padding: 0,
  } satisfies CSSProperties,
  danger: {
    padding: '6px 12px',
    background: sev.errorBg,
    color: sev.error,
    border: `1px solid ${sev.error}`,
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--fs-base)',
    fontWeight: 500,
    cursor: 'pointer',
  } satisfies CSSProperties,
} as const;

export const tag = (kind: 'live' | 'test' | 'cached' | 'degraded'): CSSProperties => ({
  background: `var(--tag-${kind}-bg)`,
  color: `var(--tag-${kind}-fg)`,
  padding: '2px 6px',
  borderRadius: 'var(--radius-xs)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 600,
});

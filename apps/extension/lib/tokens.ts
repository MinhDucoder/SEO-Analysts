/**
 * Linear-mono design tokens. Source of truth for popup, options, and
 * side panel. Mirrors `design/.planning/EXT-DESIGN-SPEC.md` § 1.
 *
 * `injectTokens()` emits a `<style>` rule on `:root` that components
 * reference via `var(--token-name)`. The rule also picks light vs
 * dark theme based on `prefers-color-scheme` and listens for changes
 * so the theme follows the OS at runtime. User override (saved
 * in chrome.storage.local under `theme`) wins when present.
 */

type ThemeTokens = Record<string, string>;

const LIGHT: ThemeTokens = {
  '--bg-canvas': '#FAFAFA',
  '--bg-surface': '#FFFFFF',
  '--bg-subtle': '#F4F4F5',
  '--bg-muted': '#EEEEEF',
  '--border-default': '#E4E4E7',
  '--border-strong': '#D4D4D8',
  '--text-primary': '#0A0A0B',
  '--text-secondary': '#52525B',
  '--text-tertiary': '#71717A',
  '--text-inverse': '#FAFAFA',
  '--accent-primary': '#0A0A0B',
  '--accent-on-primary': '#FAFAFA',
  '--sev-error-bg': '#FEF2F2',
  '--sev-warning-bg': '#FFFBEB',
  '--sev-info-bg': '#F0F9FF',
  '--sev-success-bg': '#F0FDF4',
  '--tag-live-bg': '#DCFCE7',
  '--tag-test-bg': '#DBEAFE',
  '--tag-cached-bg': '#FEF3C7',
  '--tag-degraded-bg': '#E0E7FF',
};

const DARK: ThemeTokens = {
  '--bg-canvas': '#0A0A0B',
  '--bg-surface': '#111113',
  '--bg-subtle': '#18181B',
  '--bg-muted': '#1F1F23',
  '--border-default': '#27272A',
  '--border-strong': '#3F3F46',
  '--text-primary': '#FAFAFA',
  '--text-secondary': '#A1A1AA',
  '--text-tertiary': '#71717A',
  '--text-inverse': '#0A0A0B',
  '--accent-primary': '#FAFAFA',
  '--accent-on-primary': '#0A0A0B',
  '--sev-error-bg': '#2A0F0F',
  '--sev-warning-bg': '#2A1F0A',
  '--sev-info-bg': '#0A1A2A',
  '--sev-success-bg': '#0A2A14',
  '--tag-live-bg': '#0F2A1B',
  '--tag-test-bg': '#0F1A2A',
  '--tag-cached-bg': '#2A1F0A',
  '--tag-degraded-bg': '#1A1F3A',
};

const SHARED: Record<string, string> = {
  '--sev-error': '#DC2626',
  '--sev-warning': '#B45309',
  '--sev-info': '#0284C7',
  '--sev-success': '#16A34A',
  '--tag-live-fg': '#15803D',
  '--tag-test-fg': '#1D4ED8',
  '--tag-cached-fg': '#92400E',
  '--tag-degraded-fg': '#3730A3',
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-5': '20px',
  '--space-6': '24px',
  '--radius-xs': '4px',
  '--radius-sm': '6px',
  '--radius-md': '8px',
  '--radius-lg': '12px',
  '--fs-xs': '11px',
  '--fs-sm': '12px',
  '--fs-base': '13px',
  '--fs-md': '14px',
  '--fs-lg': '15px',
  '--fs-xl': '18px',
  '--fs-2xl': '22px',
  '--fs-3xl': '28px',
  '--font-display':
    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  '--font-mono':
    '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

export type ThemeMode = 'light' | 'dark' | 'system';

function block(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}

export function buildThemeCSS(): string {
  return [
    `:root {\n${block(SHARED)}\n${block(LIGHT)}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${block(DARK)}\n  }\n}`,
    `:root[data-theme="dark"] {\n${block(DARK)}\n}`,
  ].join('\n\n');
}

const STYLE_ELEMENT_ID = 'seo-analyst-tokens';

/** Inject the token rules into <head> once per document. Idempotent. */
export function injectTokens(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = buildThemeCSS();
  document.head.appendChild(style);
}

/** Apply a theme override on the document root. Pass 'system' to clear
 * the override and revert to prefers-color-scheme. */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  if (mode === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', mode);
}

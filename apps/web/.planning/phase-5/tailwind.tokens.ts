// GENERATED — do not edit by hand. Run apps/web/.planning/phase-5/export-tokens.py
// Source: design/system-tokens.pen variables.
//
// Import into tailwind.config.ts:
//   import { tokens } from './src/styles/tailwind.tokens';
//   ... theme: { extend: tokens }

const rgb = (cssVar: string) => `rgb(var(${cssVar}) / <alpha-value>)`;

export const tokens = {
  colors: {
    bg: {
      'DEFAULT': rgb('--color-bg'),
      'elevated': rgb('--color-bg-elevated'),
      'overlay': rgb('--color-bg-overlay'),
    },
    fg: {
      'DEFAULT': rgb('--color-fg'),
      'muted': rgb('--color-fg-muted'),
      'subtle': rgb('--color-fg-subtle'),
      'disabled': rgb('--color-fg-disabled'),
    },
    border: {
      'DEFAULT': rgb('--color-border'),
      'strong': rgb('--color-border-strong'),
    },
    primary: {
      'DEFAULT': rgb('--color-primary'),
      'fg': rgb('--color-primary-fg'),
    },
    class: {
      'excellent': rgb('--color-class-excellent'),
      'good': rgb('--color-class-good'),
      'fair': rgb('--color-class-fair'),
      'poor': rgb('--color-class-poor'),
    },
    cwv: {
      'good': rgb('--color-cwv-good'),
      'needs-improvement': rgb('--color-cwv-needs-improvement'),
      'poor': rgb('--color-cwv-poor'),
    },
    status: {
      'active': rgb('--color-status-active'),
      'pending': rgb('--color-status-pending'),
      'completed': rgb('--color-status-completed'),
      'failed': rgb('--color-status-failed'),
    },
    semantic: {
      'warning': rgb('--color-warning'),
      'error': rgb('--color-error'),
      'success': rgb('--color-success'),
      'info': rgb('--color-info'),
    },
  },
  borderRadius: {
    'lg': 'var(--radius-lg)',
    'md': 'var(--radius-md)',
    'none': 'var(--radius-none)',
    'pill': 'var(--radius-pill)',
    'sm': 'var(--radius-sm)',
    'xl': 'var(--radius-xl)',
  },
  spacing: {
    '1': 'var(--space-1)',
    '2': 'var(--space-2)',
    '3': 'var(--space-3)',
    '4': 'var(--space-4)',
    '5': 'var(--space-5)',
    '6': 'var(--space-6)',
    '8': 'var(--space-8)',
    '10': 'var(--space-10)',
    '12': 'var(--space-12)',
    '16': 'var(--space-16)',
  },
  fontSize: {
    'xs': 'var(--text-xs)',
    'sm': 'var(--text-sm)',
    'base': 'var(--text-base)',
    'md': 'var(--text-md)',
    'lg': 'var(--text-lg)',
    'xl': 'var(--text-xl)',
    '2xl': 'var(--text-2xl)',
    '3xl': 'var(--text-3xl)',
    '4xl': 'var(--text-4xl)',
    '5xl': 'var(--text-5xl)',
  },
  fontFamily: {
    ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
    mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
  },
  fontWeight: {
    'bold': '700',
    'medium': '500',
    'regular': '400',
    'semibold': '600',
  },
} as const;

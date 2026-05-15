/**
 * Subset of design tokens exposed as TypeScript constants. We avoid
 * re-declaring everything — only the values that need to be read by
 * JS/SVG code (e.g. ScoreRing strokes), not the ones consumed via
 * CSS var(). When tokens.css changes, this file must be kept in
 * sync manually (see apps/extension/CLAUDE.md → tokens sync policy).
 */
export const CLASS_COLORS = {
  excellent: 'rgb(34 197 94)',  // --color-class-excellent
  good: 'rgb(59 130 246)',      // --color-class-good
  fair: 'rgb(245 158 11)',      // --color-class-fair
  poor: 'rgb(239 68 68)',       // --color-class-poor
} as const;

export type ScoreClass = keyof typeof CLASS_COLORS;

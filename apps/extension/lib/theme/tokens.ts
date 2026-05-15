/**
 * Type-only export — the ScoreClass union mirrors the keys of the
 * --color-class-{excellent|good|fair|poor} CSS variables declared in
 * tokens.css. Components that need to render those colors should use
 * `rgb(var(--color-class-${cls}))` rather than hardcoding RGB strings
 * here — that way a single source of truth (tokens.css) controls
 * theming and re-export drift is impossible.
 */
export type ScoreClass = 'excellent' | 'good' | 'fair' | 'poor';

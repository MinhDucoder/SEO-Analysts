import { CoreWebVitals } from '@repo/shared';

export function makeCwv(overrides: Partial<CoreWebVitals> = {}): CoreWebVitals {
  return {
    lcpMs: 2200,
    inpMs: 180,
    cls: 0.05,
    performanceScore: 88,
    accessibilityScore: 95,
    bestPracticesScore: 92,
    seoScore: 100,
    ...overrides,
  };
}

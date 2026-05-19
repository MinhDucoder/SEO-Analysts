import { describe, it, expect } from 'vitest';
import { runSmoke } from './seo-analyzer-smoke.js';

describe('seo-analyzer smoke example [CI wrapper]', () => {
  it('produces a structured Review payload end-to-end', async () => {
    const review = await runSmoke();
    expect(review.summary).toMatch(/.+/);
    expect(Array.isArray(review.issues)).toBe(true);
    if (review.issues.length > 0) {
      expect(review.issues[0]).toMatchObject({
        rule: expect.any(String),
        severity: expect.stringMatching(/^(low|medium|high)$/),
        line: expect.any(Number),
        suggestion: expect.any(String),
      });
    }
  }, 10_000);

  it('snapshot of canned output is stable across runs', async () => {
    const a = await runSmoke();
    const b = await runSmoke();
    expect(a).toEqual(b);
  });
});

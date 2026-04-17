import { describe, expect, it } from 'vitest';
import { ScoreCalculator } from '../../src/analyzer/services/score-calculator';
import { CheckStatus, Classification, IssueCategory } from '@repo/shared';
import type { RunnerResult } from '../../src/analyzer/services/rule-runner';

function r(overrides: Partial<RunnerResult>): RunnerResult {
  return {
    ruleId: overrides.ruleId ?? 'x',
    ruleName: overrides.ruleName ?? 'x',
    category: overrides.category ?? IssueCategory.META,
    weight: overrides.weight ?? 1,
    status: overrides.status ?? CheckStatus.PASS,
    score: overrides.score ?? 100,
    message: overrides.message ?? 'ok',
    suggestion: overrides.suggestion ?? null,
    metadata: overrides.metadata ?? {},
  };
}

describe('ScoreCalculator', () => {
  const calc = new ScoreCalculator();

  it('returns 0 overall for empty results', () => {
    expect(calc.overall([])).toBe(0);
  });

  it('computes weighted average overall score', () => {
    // 100*8 + 0*8 + 50*4 = 800 + 0 + 200 = 1000 / (8+8+4)=20  => 50
    const results = [
      r({ score: 100, weight: 8 }),
      r({ score: 0, weight: 8 }),
      r({ score: 50, weight: 4 }),
    ];
    expect(calc.overall(results)).toBe(50);
  });

  it('rounds overall to 2 decimals', () => {
    // 100*7 + 0*3 = 700 / 10 = 70.0
    const results = [r({ score: 100, weight: 7 }), r({ score: 0, weight: 3 })];
    expect(calc.overall(results)).toBe(70);
  });

  it('classifies scores correctly', () => {
    expect(calc.classify(95)).toBe(Classification.EXCELLENT);
    expect(calc.classify(80)).toBe(Classification.EXCELLENT);
    expect(calc.classify(79.9)).toBe(Classification.GOOD);
    expect(calc.classify(60)).toBe(Classification.GOOD);
    expect(calc.classify(40)).toBe(Classification.FAIR);
    expect(calc.classify(39.9)).toBe(Classification.POOR);
    expect(calc.classify(0)).toBe(Classification.POOR);
  });

  it('computes per-category scores with counts', () => {
    const results = [
      r({ category: IssueCategory.META, score: 100, weight: 8, status: CheckStatus.PASS }),
      r({ category: IssueCategory.META, score: 50, weight: 7, status: CheckStatus.WARN }),
      r({ category: IssueCategory.HEADINGS, score: 0, weight: 8, status: CheckStatus.FAIL }),
    ];
    const per = calc.perCategory(results);
    const meta = per.find((c) => c.category === IssueCategory.META)!;
    expect(meta.totalRules).toBe(2);
    expect(meta.passed).toBe(1);
    expect(meta.warned).toBe(1);
    expect(meta.failed).toBe(0);
    // (100*8 + 50*7)/(8+7) = (800+350)/15 = 76.67
    expect(meta.score).toBeCloseTo(76.67, 1);

    const headings = per.find((c) => c.category === IssueCategory.HEADINGS)!;
    expect(headings.failed).toBe(1);
    expect(headings.score).toBe(0);
  });
});

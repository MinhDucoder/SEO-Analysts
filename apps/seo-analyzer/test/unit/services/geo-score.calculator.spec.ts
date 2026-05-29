import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { calculateGeoScore } from '../../../src/analyzer/services/geo-score.calculator';

const r = (id: string, status: CheckStatus) => ({ ruleId: id, status, score: status === CheckStatus.PASS ? 100 : status === CheckStatus.WARN ? 50 : 0, weight: 12.5 });

describe('calculateGeoScore', () => {
  it('returns 100 when all 8 pass', () => {
    const results = ['g1','g2','g3','g4','g5','g6','g7','g8'].map((id) => r(id, CheckStatus.PASS));
    expect(calculateGeoScore(results)).toEqual({ score: 100, version: '1.0' });
  });

  it('returns 0 when all fail', () => {
    const results = ['g1','g2','g3','g4','g5','g6','g7','g8'].map((id) => r(id, CheckStatus.FAIL));
    expect(calculateGeoScore(results).score).toBe(0);
  });

  it('weighted average of mixed statuses', () => {
    const results = [r('g1', CheckStatus.PASS), r('g2', CheckStatus.FAIL), r('g3', CheckStatus.WARN), r('g4', CheckStatus.PASS), r('g5', CheckStatus.PASS), r('g6', CheckStatus.PASS), r('g7', CheckStatus.PASS), r('g8', CheckStatus.PASS)];
    // 6*100 + 50 + 0 = 650; total weight 8*12.5 = 100; score = 650/8 = 81
    expect(calculateGeoScore(results).score).toBe(81);
  });

  it('marks version 1.0-degraded when any LLM rule errored', () => {
    const results = [r('g1', CheckStatus.PASS), r('g2', CheckStatus.PASS), r('geo_direct_answer_intro', CheckStatus.WARN), r('g4', CheckStatus.PASS), r('g5', CheckStatus.PASS), r('g6', CheckStatus.PASS), r('g7', CheckStatus.PASS), r('g8', CheckStatus.PASS)];
    const errored = results.map((x) => ({ ...x, errored: x.ruleId === 'geo_direct_answer_intro' }));
    expect(calculateGeoScore(errored).version).toBe('1.0-degraded');
  });

  it('returns null when no results', () => {
    expect(calculateGeoScore([])).toEqual({ score: null, version: null });
  });
});

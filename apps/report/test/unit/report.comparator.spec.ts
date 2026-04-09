import { describe, expect, it } from 'vitest';
import { ReportComparator } from '../../src/report/report.comparator';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { AnalyzeRuleResult } from '../../src/report/interfaces/analyze-result.interface';

function rule(id: string, status: CheckStatus, score = status === CheckStatus.PASS ? 100 : status === CheckStatus.WARN ? 50 : 0): AnalyzeRuleResult {
  return {
    ruleId: id,
    ruleName: id,
    category: IssueCategory.META,
    status,
    score,
    weight: 5,
    message: '',
    suggestion: null,
    metadata: {},
  };
}

const baseReport = (rules: AnalyzeRuleResult[], finalScore: number) => ({
  finalScore,
  analysisSnapshot: { ruleResults: rules },
});

describe('ReportComparator', () => {
  const comparator = new ReportComparator();

  it('computes scoreDelta = after - before', () => {
    const a: any = baseReport([rule('r1', CheckStatus.PASS)], 70);
    const b: any = baseReport([rule('r1', CheckStatus.PASS)], 85);
    const out = comparator.compare(a, b);
    expect(out.scoreDelta).toBe(15);
  });

  it('detects fixed issues (FAIL → PASS) and new issues (PASS → FAIL)', () => {
    const before: any = baseReport(
      [rule('r1', CheckStatus.FAIL), rule('r2', CheckStatus.PASS), rule('r3', CheckStatus.WARN)],
      50,
    );
    const after: any = baseReport(
      [rule('r1', CheckStatus.PASS), rule('r2', CheckStatus.FAIL), rule('r3', CheckStatus.WARN)],
      55,
    );
    const out = comparator.compare(before, after);
    expect(out.issuesFixed).toEqual(['r1']);
    expect(out.issuesNew).toEqual(['r2']);
  });

  it('produces a RuleDelta entry for every rule appearing in either report', () => {
    const before: any = baseReport([rule('r1', CheckStatus.PASS), rule('r2', CheckStatus.PASS)], 70);
    const after: any = baseReport([rule('r2', CheckStatus.WARN), rule('r3', CheckStatus.PASS)], 70);
    const out = comparator.compare(before, after);
    const ids = out.ruleDeltas.map((d) => d.ruleId).sort();
    expect(ids).toEqual(['r1', 'r2', 'r3']);
  });
});

import { describe, expect, it } from 'vitest';
import { ReportAggregator } from '../../src/report/services/report.aggregator';
import { Classification, CheckStatus, IssueCategory } from '@repo/shared';
import { makeAnalyzeResult } from '../fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../fixtures/keyword-result.fixture';
import { makeCwv } from '../fixtures/cwv.fixture';

describe('ReportAggregator', () => {
  const aggregator = new ReportAggregator();

  it('blends analyzer overall (70%) with CWV performance (30%) into finalScore', () => {
    const out = aggregator.aggregate({
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      analyze: makeAnalyzeResult({ overallScore: 80 }),
      keywords: makeKeywordResult(),
      cwv: makeCwv({ performanceScore: 60 }),
    });
    // 80*0.7 + 60*0.3 = 56 + 18 = 74
    expect(out.finalScore).toBe(74);
    expect(out.classification).toBe(Classification.GOOD);
  });

  it('counts pass/warn/critical issues from rule results', () => {
    const out = aggregator.aggregate({
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      analyze: makeAnalyzeResult({
        ruleResults: [
          { ruleId: 'r1', ruleName: 'a', category: IssueCategory.META, status: CheckStatus.PASS, score: 100, weight: 5, message: '', suggestion: null, metadata: {} },
          { ruleId: 'r2', ruleName: 'b', category: IssueCategory.META, status: CheckStatus.WARN, score: 50, weight: 5, message: '', suggestion: null, metadata: {} },
          { ruleId: 'r3', ruleName: 'c', category: IssueCategory.HEADINGS, status: CheckStatus.FAIL, score: 0, weight: 9, message: '', suggestion: null, metadata: {} },
          { ruleId: 'r4', ruleName: 'd', category: IssueCategory.HEADINGS, status: CheckStatus.FAIL, score: 0, weight: 3, message: '', suggestion: null, metadata: {} },
        ],
      }),
      keywords: makeKeywordResult(),
      cwv: makeCwv(),
    });
    expect(out.passCount).toBe(1);
    expect(out.warnIssues).toBe(1);
    // critical = FAIL with weight >= 7
    expect(out.criticalIssues).toBe(1);
    expect(out.totalIssues).toBe(3); // warn + fail
  });

  it('classifies POOR for finalScore below 40', () => {
    const out = aggregator.aggregate({
      auditId: 'aud-1',
      url: 'https://x.com/',
      domain: 'x.com',
      analyze: makeAnalyzeResult({ overallScore: 20 }),
      keywords: makeKeywordResult(),
      cwv: makeCwv({ performanceScore: 30 }),
    });
    expect(out.classification).toBe(Classification.POOR);
  });

  it('attaches analyze and cwv snapshots verbatim', () => {
    const analyze = makeAnalyzeResult();
    const cwv = makeCwv();
    const out = aggregator.aggregate({
      auditId: 'aud-1',
      url: analyze.url,
      domain: analyze.domain,
      analyze,
      keywords: makeKeywordResult(),
      cwv,
    });
    expect(out.analysisSnapshot).toBe(analyze);
    expect(out.cwvSnapshot).toBe(cwv);
  });
});

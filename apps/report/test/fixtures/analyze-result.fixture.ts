import { CheckStatus, IssueCategory } from '@repo/shared';
import { AnalyzeResult } from '../../src/report/domain/analyze-result.interface';

export function makeAnalyzeResult(overrides: Partial<AnalyzeResult> = {}): AnalyzeResult {
  return {
    auditId: '00000000-0000-0000-0000-000000000001',
    url: 'https://example.com/',
    domain: 'example.com',
    overallScore: 82,
    ruleResults: [
      {
        ruleId: 'r-title_tag',
        ruleName: 'title_tag',
        category: IssueCategory.META,
        status: CheckStatus.PASS,
        score: 100,
        weight: 9,
        message: 'Title length OK',
        suggestion: null,
        metadata: { length: 55 },
      },
      {
        ruleId: 'r-meta_description',
        ruleName: 'meta_description',
        category: IssueCategory.META,
        status: CheckStatus.WARN,
        score: 50,
        weight: 8,
        message: 'Meta description slightly short',
        suggestion: 'Aim for 120-160 characters',
        metadata: { length: 110 },
      },
      {
        ruleId: 'r-h1_tag',
        ruleName: 'h1_tag',
        category: IssueCategory.HEADINGS,
        status: CheckStatus.FAIL,
        score: 0,
        weight: 9,
        message: 'Missing H1',
        suggestion: 'Add a single H1 tag',
        metadata: {},
      },
    ],
    categoryScores: [
      { category: IssueCategory.META, score: 75, passCount: 1, warnCount: 1, failCount: 0 },
      { category: IssueCategory.HEADINGS, score: 0, passCount: 0, warnCount: 0, failCount: 1 },
    ],
    ...overrides,
  };
}

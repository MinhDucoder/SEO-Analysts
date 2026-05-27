import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AnalyzerController } from '../../src/analyzer/controllers/analyzer.controller';
import { AnalyzerService } from '../../src/analyzer/services/analyzer.service';
import { RuleRegistry } from '../../src/analyzer/services/rule-registry';
import { RuleMetadataService } from '../../src/analyzer/services/rule-metadata.service';
import { CheckStatus, IssueCategory } from '@repo/shared';

/**
 * Guards the gRPC wire contract of AnalyzePage. proto-loader runs with
 * `keepCase: false` + `enums: String` on both ends, so the response MUST use
 * camelCase keys and proto enum *names* — snake_case keys (`rule_results`,
 * `overall_score`) and lowercase enum values are silently dropped, which is
 * exactly how site audits ended up storing score=0 / issues=[] for every page.
 */
describe('AnalyzerController.analyzePage (gRPC wire contract)', () => {
  let ctrl: AnalyzerController;

  beforeEach(() => {
    const analyzer = {
      analyze: vi.fn().mockResolvedValue({
        auditId: 'audit-1',
        overallScore: 73.81,
        classification: 'good',
        ruleResults: [
          {
            ruleId: 'title_tag',
            ruleName: 'Title Tag',
            status: CheckStatus.FAIL,
            score: 40,
            weight: 8,
            category: IssueCategory.META,
            message: 'Missing title',
            suggestion: 'Add a title',
            metadata: { len: 0 },
          },
        ],
        categoryScores: [
          {
            category: IssueCategory.META,
            score: 40,
            totalRules: 4,
            passed: 2,
            warned: 1,
            failed: 1,
          },
        ],
      }),
    } as unknown as AnalyzerService;

    ctrl = new AnalyzerController(
      analyzer,
      new RuleRegistry(),
      new RuleMetadataService(),
    );
  });

  it('returns camelCase keys with a populated overall score', async () => {
    const res = await ctrl.analyzePage({ auditId: 'audit-1', pageData: { url: 'https://x' } });
    expect(res.overallScore).toBe(73.81);
    expect(res.ruleResults).toHaveLength(1);
    expect(res.categoryScores[0]!.totalRules).toBe(4);
    expect(res.auditId).toBe('audit-1');
    // No snake_case leftovers that the loader would drop.
    expect((res as Record<string, unknown>).rule_results).toBeUndefined();
    expect((res as Record<string, unknown>).overall_score).toBeUndefined();
  });

  it('maps rule status + category to proto enum names', async () => {
    const res = await ctrl.analyzePage({ auditId: 'audit-1', pageData: { url: 'https://x' } });
    const rule = res.ruleResults[0]!;
    expect(rule.ruleId).toBe('title_tag');
    expect(rule.status).toBe('CHECK_STATUS_FAIL');
    expect(rule.category).toBe('ISSUE_CATEGORY_META');
    expect(res.categoryScores[0]!.category).toBe('ISSUE_CATEGORY_META');
  });
});

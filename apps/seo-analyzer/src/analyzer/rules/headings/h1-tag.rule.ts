import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class H1TagRule implements ISeoRule {
  readonly id = 'h1_tag';
  readonly category = IssueCategory.HEADINGS;

  check(pageData: PageData, targetKeyword?: string): RuleCheckOutput {
    const count = pageData.h1Tags.length;
    if (count === 0) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'No H1 tag found',
        suggestion: 'Add exactly one H1 that describes the page topic.',
        metadata: { count },
      };
    }
    if (count > 1) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: `Found ${count} H1 tags; exactly one is required`,
        suggestion: 'Keep a single H1 and demote the rest to H2.',
        metadata: { count },
      };
    }
    const h1 = (pageData.h1Tags[0] ?? '').toLowerCase();
    if (targetKeyword && !h1.includes(targetKeyword.toLowerCase())) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: 'H1 present but does not contain the target keyword',
        suggestion: `Include "${targetKeyword}" in the H1 for stronger topical relevance.`,
        metadata: { count, h1: pageData.h1Tags[0] },
      };
    }
    return {
      status: CheckStatus.PASS,
      score: 100,
      message: 'Exactly one H1 found',
      suggestion: null,
      metadata: { count, h1: pageData.h1Tags[0] },
    };
  }
}

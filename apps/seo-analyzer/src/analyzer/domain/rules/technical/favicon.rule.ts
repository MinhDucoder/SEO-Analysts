import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class FaviconRule implements ISeoRule {
  readonly id = 'favicon';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const favicon = pageData.faviconUrl?.trim();
    if (favicon) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'Favicon is declared',
        suggestion: null,
        metadata: { favicon },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'Favicon is missing',
      suggestion: 'Add <link rel="icon" href="/favicon.ico">.',
      metadata: {},
    };
  }
}

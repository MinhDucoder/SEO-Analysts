import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class InternalLinksRule implements ISeoRule {
  readonly id = 'internal_links';
  readonly category = IssueCategory.LINKS;

  check(pageData: PageData): RuleCheckOutput {
    const count = pageData.internalLinks.length;
    if (count >= 3) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `${count} internal links found`,
        suggestion: null,
        metadata: { count },
      };
    }
    if (count >= 1) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Only ${count} internal link(s) found`,
        suggestion: 'Add at least 3 internal links to support crawling and topic clusters.',
        metadata: { count },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'No internal links found',
      suggestion: 'Add internal links to related pages within your site.',
      metadata: { count },
    };
  }
}

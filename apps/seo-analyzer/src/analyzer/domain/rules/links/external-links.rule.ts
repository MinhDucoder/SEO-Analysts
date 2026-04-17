/**
 * @file Rule: external-link hygiene (rel=nofollow where appropriate).
 */
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class ExternalLinksRule implements ISeoRule {
  readonly id = 'external_links';
  readonly category = IssueCategory.LINKS;

  check(pageData: PageData): RuleCheckOutput {
    const externals = pageData.externalLinks;
    if (externals.length === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'No external links on the page',
        suggestion: null,
        metadata: { total: 0 },
      };
    }
    const broken = externals.filter((l) => l.statusCode >= 400).length;
    if (broken > 0) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: `${broken} external link(s) return 4xx/5xx`,
        suggestion: 'Fix or remove broken external links.',
        metadata: { total: externals.length, broken },
      };
    }
    const missingRel = externals.filter((l) => !(l.rel ?? '').toLowerCase().includes('noopener')).length;
    if (missingRel === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'All external links use rel=noopener',
        suggestion: null,
        metadata: { total: externals.length },
      };
    }
    return {
      status: CheckStatus.WARN,
      score: 50,
      message: `${missingRel}/${externals.length} external links are missing rel=noopener`,
      suggestion: 'Add rel="noopener noreferrer" to all external target=_blank links.',
      metadata: { total: externals.length, missingRel },
    };
  }
}

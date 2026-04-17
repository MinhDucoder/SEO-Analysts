/**
 * @file Rule: canonical URL set and same-origin.
 */
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class CanonicalUrlRule implements ISeoRule {
  readonly id = 'canonical_url';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const canonical = pageData.canonicalUrl?.trim();
    if (!canonical) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Canonical URL is missing',
        suggestion: 'Add <link rel="canonical" href="..."> to indicate the preferred URL.',
        metadata: {},
      };
    }
    try {
      const pageHost = new URL(pageData.url).hostname;
      const canonHost = new URL(canonical).hostname;
      if (pageHost === canonHost) {
        return {
          status: CheckStatus.PASS,
          score: 100,
          message: 'Canonical URL is present and on same domain',
          suggestion: null,
          metadata: { canonical },
        };
      }
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: 'Canonical URL points to a different domain',
        suggestion: 'Verify cross-domain canonical is intentional.',
        metadata: { canonical, pageHost, canonHost },
      };
    } catch {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Canonical URL is malformed',
        suggestion: 'Provide an absolute canonical URL.',
        metadata: { canonical },
      };
    }
  }
}

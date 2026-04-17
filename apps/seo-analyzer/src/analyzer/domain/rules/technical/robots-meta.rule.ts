/**
 * @file Rule: robots meta permits indexing + following.
 */
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class RobotsMetaRule implements ISeoRule {
  readonly id = 'robots_meta';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const robots = (pageData.metaRobots ?? '').toLowerCase();
    if (!robots || robots.includes('index')) {
      if (robots.includes('noindex')) {
        return {
          status: CheckStatus.FAIL,
          score: 0,
          message: 'Page has noindex directive',
          suggestion: 'Remove noindex if the page should appear in search results.',
          metadata: { robots },
        };
      }
      if (robots.includes('nofollow')) {
        return {
          status: CheckStatus.WARN,
          score: 50,
          message: 'Page is indexable but all links are nofollow',
          suggestion: 'Allow at least some followable links to share link equity.',
          metadata: { robots },
        };
      }
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: robots ? `Robots meta is "${robots}"` : 'No robots meta (defaults to index,follow)',
        suggestion: null,
        metadata: { robots },
      };
    }
    if (robots.includes('noindex')) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Page has noindex directive',
        suggestion: 'Remove noindex if this page should appear in search results.',
        metadata: { robots },
      };
    }
    return {
      status: CheckStatus.PASS,
      score: 100,
      message: `Robots meta is "${robots}"`,
      suggestion: null,
      metadata: { robots },
    };
  }
}

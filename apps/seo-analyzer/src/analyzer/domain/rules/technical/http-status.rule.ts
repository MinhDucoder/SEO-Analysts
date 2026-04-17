/**
 * @file Rule: HTTP status 200 (or acceptable 3xx).
 */
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class HttpStatusRule implements ISeoRule {
  readonly id = 'http_status';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const status = pageData.statusCode;
    if (status === 200) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'Page returns 200 OK',
        suggestion: null,
        metadata: { statusCode: status },
      };
    }
    if (status === 301 || status === 302) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Page returns ${status} redirect`,
        suggestion: 'Prefer serving canonical URLs directly with 200.',
        metadata: { statusCode: status },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `Page returns ${status}`,
      suggestion: 'Fix the error so the page returns 200 OK.',
      metadata: { statusCode: status },
    };
  }
}

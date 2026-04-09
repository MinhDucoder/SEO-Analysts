import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class HttpsCheckRule implements ISeoRule {
  readonly id = 'https_check';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    if (pageData.isHttps) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'Page is served over HTTPS',
        suggestion: null,
        metadata: { isHttps: true },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'Page is served over HTTP',
      suggestion: 'Install a TLS certificate and redirect HTTP to HTTPS.',
      metadata: { isHttps: false },
    };
  }
}

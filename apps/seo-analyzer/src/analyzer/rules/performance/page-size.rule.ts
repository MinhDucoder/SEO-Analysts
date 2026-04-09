import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

const MB = 1024 * 1024;

export class PageSizeRule implements ISeoRule {
  readonly id = 'page_size';
  readonly category = IssueCategory.PERFORMANCE;

  check(pageData: PageData): RuleCheckOutput {
    const bytes = pageData.htmlSizeBytes;
    const mb = Math.round((bytes / MB) * 100) / 100;
    if (bytes < 2 * MB) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `HTML size is ${mb} MB`,
        suggestion: null,
        metadata: { bytes, mb },
      };
    }
    if (bytes <= 5 * MB) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `HTML size is ${mb} MB (target <2 MB)`,
        suggestion: 'Compress HTML, minify, and defer non-critical scripts.',
        metadata: { bytes, mb },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `HTML size is ${mb} MB (over 5 MB limit)`,
      suggestion: 'Reduce page weight: split code, compress, remove unused assets.',
      metadata: { bytes, mb },
    };
  }
}

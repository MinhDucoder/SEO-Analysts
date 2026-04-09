import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class ViewportMetaRule implements ISeoRule {
  readonly id = 'viewport_meta';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const vp = pageData.viewportContent?.trim();
    if (!vp) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Viewport meta tag is missing',
        suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
        metadata: {},
      };
    }
    if (vp.toLowerCase().includes('width=device-width')) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'Viewport meta is mobile-friendly',
        suggestion: null,
        metadata: { viewport: vp },
      };
    }
    return {
      status: CheckStatus.WARN,
      score: 50,
      message: 'Viewport meta present but not responsive',
      suggestion: 'Use width=device-width for mobile responsiveness.',
      metadata: { viewport: vp },
    };
  }
}

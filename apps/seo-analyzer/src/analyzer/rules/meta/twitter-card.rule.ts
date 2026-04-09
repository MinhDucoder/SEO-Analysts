import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class TwitterCardRule implements ISeoRule {
  readonly id = 'twitter_card';
  readonly category = IssueCategory.META;

  check(pageData: PageData): RuleCheckOutput {
    const card = pageData.twitterCard?.['twitter:card'];
    if (card && card.trim() !== '') {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `Twitter card "${card}" present`,
        suggestion: null,
        metadata: { card },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'Twitter card is missing',
      suggestion: 'Add <meta name="twitter:card" content="summary_large_image">.',
      metadata: {},
    };
  }
}

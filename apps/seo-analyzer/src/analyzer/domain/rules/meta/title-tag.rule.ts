import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class TitleTagRule implements ISeoRule {
  readonly id = 'title_tag';
  readonly category = IssueCategory.META;

  check(pageData: PageData): RuleCheckOutput {
    const title = pageData.title?.trim() ?? '';
    const len = title.length;

    if (len >= 50 && len <= 60) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `Title length ${len} is optimal (50-60 chars)`,
        suggestion: null,
        metadata: { length: len },
      };
    }
    if ((len >= 30 && len <= 49) || (len >= 61 && len <= 70)) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Title length ${len} is acceptable but not optimal`,
        suggestion: 'Adjust title to 50-60 characters for best SERP display.',
        metadata: { length: len },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: len === 0 ? 'Title tag is missing' : `Title length ${len} is out of range`,
      suggestion: 'Add a title between 50 and 60 characters that includes the primary keyword.',
      metadata: { length: len },
    };
  }
}

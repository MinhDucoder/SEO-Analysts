import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class LanguageTagRule implements ISeoRule {
  readonly id = 'language_tag';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const lang = pageData.language?.trim();
    if (lang) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `HTML lang="${lang}" declared`,
        suggestion: null,
        metadata: { lang },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'HTML lang attribute is missing',
      suggestion: 'Add lang attribute to <html> element (e.g. lang="en").',
      metadata: {},
    };
  }
}

/**
 * @file Rule: meta description present + optimal length (120-160 chars).
 */
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class MetaDescriptionRule implements ISeoRule {
  readonly id = 'meta_description';
  readonly category = IssueCategory.META;

  check(pageData: PageData): RuleCheckOutput {
    const desc = pageData.metaDescription?.trim() ?? '';
    const len = desc.length;

    if (len >= 120 && len <= 160) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `Meta description length ${len} is optimal`,
        suggestion: null,
        metadata: { length: len },
      };
    }
    if ((len >= 80 && len <= 119) || (len >= 161 && len <= 200)) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Meta description length ${len} is acceptable`,
        suggestion: 'Target 120-160 characters for best SERP snippet.',
        metadata: { length: len },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: len === 0 ? 'Meta description is missing' : `Meta description length ${len} is out of range`,
      suggestion: 'Add a meta description between 120 and 160 characters.',
      metadata: { length: len },
    };
  }
}

/**
 * @file Rule: every image has a non-empty alt attribute.
 */
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class ImageAltRule implements ISeoRule {
  readonly id = 'image_alt';
  readonly category = IssueCategory.IMAGES;

  check(pageData: PageData): RuleCheckOutput {
    const total = pageData.images.length;
    if (total === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'No images on the page',
        suggestion: null,
        metadata: { total: 0 },
      };
    }
    const withAlt = pageData.images.filter((i) => typeof i.alt === 'string' && i.alt.trim() !== '').length;
    const ratio = withAlt / total;
    const percent = Math.round(ratio * 100);

    if (ratio > 0.9) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `${percent}% of images have alt text`,
        suggestion: null,
        metadata: { total, withAlt, percent },
      };
    }
    if (ratio >= 0.7) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `${percent}% of images have alt text`,
        suggestion: 'Add descriptive alt attributes to the remaining images.',
        metadata: { total, withAlt, percent },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `Only ${percent}% of images have alt text`,
      suggestion: 'Add descriptive alt attributes to improve accessibility and SEO.',
      metadata: { total, withAlt, percent },
    };
  }
}

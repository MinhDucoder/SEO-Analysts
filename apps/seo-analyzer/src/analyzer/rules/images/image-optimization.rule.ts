import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

const MODERN_FORMATS = new Set(['webp', 'avif']);
const MAX_BYTES = 200 * 1024;

export class ImageOptimizationRule implements ISeoRule {
  readonly id = 'image_optimization';
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
    let issues = 0;
    for (const img of pageData.images) {
      const badFormat = !MODERN_FORMATS.has(img.format.toLowerCase());
      const oversized = img.sizeBytes > MAX_BYTES;
      if (badFormat || oversized) issues++;
    }
    const ratio = issues / total;
    if (ratio === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'All images use a modern format and are under 200KB',
        suggestion: null,
        metadata: { total, issues },
      };
    }
    if (ratio <= 0.5) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `${issues}/${total} images are oversized or use legacy formats`,
        suggestion: 'Convert images to WebP/AVIF and keep each under 200KB.',
        metadata: { total, issues },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `${issues}/${total} images have optimization issues`,
      suggestion: 'Convert to WebP/AVIF and compress to under 200KB.',
      metadata: { total, issues },
    };
  }
}

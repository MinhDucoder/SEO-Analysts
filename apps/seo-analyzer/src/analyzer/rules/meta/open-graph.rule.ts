import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

const REQUIRED = ['og:title', 'og:description', 'og:image'] as const;

export class OpenGraphRule implements ISeoRule {
  readonly id = 'open_graph';
  readonly category = IssueCategory.META;

  check(pageData: PageData): RuleCheckOutput {
    const og = pageData.openGraph ?? {};
    const present = REQUIRED.filter((k) => typeof og[k] === 'string' && og[k].trim() !== '');
    const count = present.length;

    if (count === 3) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'All required Open Graph tags are present',
        suggestion: null,
        metadata: { present },
      };
    }
    if (count >= 1) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Only ${count}/3 Open Graph tags are present`,
        suggestion: `Add missing tags: ${REQUIRED.filter((k) => !present.includes(k)).join(', ')}`,
        metadata: { present },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'No Open Graph tags found',
      suggestion: 'Add og:title, og:description, and og:image for better social sharing.',
      metadata: { present },
    };
  }
}

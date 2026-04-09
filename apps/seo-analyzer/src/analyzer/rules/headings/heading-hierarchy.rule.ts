import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class HeadingHierarchyRule implements ISeoRule {
  readonly id = 'heading_hierarchy';
  readonly category = IssueCategory.HEADINGS;

  check(pageData: PageData): RuleCheckOutput {
    const levels = [
      pageData.h1Tags.length,
      pageData.h2Tags.length,
      pageData.h3Tags.length,
      pageData.h4Tags.length,
      pageData.h5Tags.length,
      pageData.h6Tags.length,
    ];
    const total = levels.reduce((a, b) => a + b, 0);
    if (total === 0) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'No headings found on the page',
        suggestion: 'Structure your content with H1, H2 and H3 headings.',
        metadata: { levels },
      };
    }

    // Build presence sequence h1..h6
    let previousLevel = 0;
    let skipped = false;
    let majorSkip = false;
    for (let i = 0; i < 6; i++) {
      if ((levels[i] ?? 0) > 0) {
        const currentLevel = i + 1; // 1-indexed heading level
        if (previousLevel === 0 && i !== 0) {
          // Starts at H2 or lower without H1
          majorSkip = true;
        } else if (previousLevel > 0 && currentLevel - previousLevel > 1) {
          skipped = true;
          if (currentLevel - previousLevel >= 3) majorSkip = true;
        }
        previousLevel = currentLevel;
      }
    }

    if (levels[0] === 0 || majorSkip) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Heading hierarchy has major structural issues',
        suggestion: 'Start with a single H1, then use H2/H3 in order without jumping levels.',
        metadata: { levels },
      };
    }
    if (skipped) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: 'Heading hierarchy skips levels (e.g. H2 to H4)',
        suggestion: 'Avoid skipping heading levels — use H3 between H2 and H4.',
        metadata: { levels },
      };
    }
    return {
      status: CheckStatus.PASS,
      score: 100,
      message: 'Heading hierarchy is well-structured',
      suggestion: null,
      metadata: { levels },
    };
  }
}

import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class QuotableDensityRule implements ISeoRule {
  readonly id = 'geo_quotable_density';
  readonly category = IssueCategory.GEO;

  check(pageData: PageData): RuleCheckOutput {
    const q = (pageData as any).quotableBlocks ?? { tables: 0, lists: 0, blockquotes: 0, dls: 0 };
    const total = q.tables + q.lists + q.blockquotes + q.dls;
    const words = (pageData.textContent ?? '').trim().split(/\s+/).filter(Boolean).length;
    const density = words > 0 ? (total / words) * 1000 : 0;
    const meta = { ...q, wordCount: words, density: Number(density.toFixed(2)) };
    if (density < 1.0) {
      return { status: CheckStatus.FAIL, score: 0, message: `Quotable density ${density.toFixed(2)}/1000 words (need ≥3)`, suggestion: 'Add tables, lists, or blockquotes — AI systems prefer extractable structures.', metadata: meta };
    }
    if (density < 3.0) {
      return { status: CheckStatus.WARN, score: 50, message: `Quotable density ${density.toFixed(2)}/1000 words (need ≥3)`, suggestion: 'Add more tables, lists, or blockquotes.', metadata: meta };
    }
    return { status: CheckStatus.PASS, score: 100, message: `Quotable density ${density.toFixed(2)}/1000 words`, suggestion: null, metadata: meta };
  }
}

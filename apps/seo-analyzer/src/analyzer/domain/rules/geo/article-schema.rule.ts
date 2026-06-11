import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

const ALLOWED_TYPES = ['Article', 'BlogPosting', 'NewsArticle'];
const REQUIRED = ['headline', 'author', 'datePublished', 'image'] as const;

export class ArticleSchemaRule implements ISeoRule {
  readonly id = 'geo_article_schema';
  readonly category = IssueCategory.GEO;

  check(pageData: PageData): RuleCheckOutput {
    const blocks = (pageData.jsonLdBlocks ?? []).filter(
      (b: any) => typeof b === 'object' && ALLOWED_TYPES.includes(String(b['@type'])),
    );
    if (blocks.length === 0) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'No Article/BlogPosting/NewsArticle JSON-LD found',
        suggestion: 'Add Article schema. NOTE: FAQPage was deprecated 2026-05-07; use Article instead.',
        metadata: { schemaTypesFound: (pageData.jsonLdBlocks ?? []).map((b: any) => b?.['@type'] ?? null) },
      };
    }
    const best = blocks.map((b: any) => ({
      type: b['@type'],
      missing: REQUIRED.filter((f) => !b[f]),
    })).sort((a, b) => a.missing.length - b.missing.length)[0]!;

    if (best.missing.length >= 2) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: `Article schema missing ${best.missing.length} required fields: ${best.missing.join(', ')}`,
        suggestion: `Add ${best.missing.join(' + ')} to the JSON-LD block.`,
        metadata: { schemaType: best.type, missingFields: best.missing },
      };
    }
    if (best.missing.length === 1) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Article schema missing required field: ${best.missing[0]}`,
        suggestion: `Add ${best.missing[0]} to be eligible for rich result.`,
        metadata: { schemaType: best.type, missingFields: best.missing },
      };
    }
    return {
      status: CheckStatus.PASS,
      score: 100,
      message: `${best.type} schema is complete`,
      suggestion: null,
      metadata: { schemaType: best.type, missingFields: [] },
    };
  }
}

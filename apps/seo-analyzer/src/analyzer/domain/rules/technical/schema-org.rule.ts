import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class SchemaOrgRule implements ISeoRule {
  readonly id = 'schema_org';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const count = pageData.schemaJsonLd.length;
    if (count > 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `${count} JSON-LD block(s) found`,
        suggestion: null,
        metadata: { count },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'No structured data (JSON-LD) found',
      suggestion: 'Add schema.org JSON-LD for Article, Product, FAQ, etc.',
      metadata: { count: 0 },
    };
  }
}

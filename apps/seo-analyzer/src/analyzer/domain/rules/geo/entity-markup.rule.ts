import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

const ALLOWED = ['Article', 'BlogPosting', 'NewsArticle'];
const FRESH_DAYS = 180;

export class EntityMarkupRule implements ISeoRule {
  readonly id = 'geo_entity_markup';
  readonly category = IssueCategory.GEO;

  constructor(private readonly now: () => Date = () => new Date()) {}

  check(pageData: PageData): RuleCheckOutput {
    const article = (pageData.jsonLdBlocks ?? []).find(
      (b: any) => typeof b === 'object' && ALLOWED.includes(String(b['@type'])),
    ) as any;
    if (!article) {
      return { status: CheckStatus.FAIL, score: 0, message: 'No Article schema to check entity markup', suggestion: 'Add Article JSON-LD first (see G5).', metadata: {} };
    }
    const author = article.author;
    const authorOk = author && (author['@type'] === 'Person' || Array.isArray(author)) && (author.name || (Array.isArray(author) && author[0]?.name));
    if (!authorOk) {
      return { status: CheckStatus.FAIL, score: 0, message: 'Missing author.@type=Person with name', suggestion: 'Add author: { "@type": "Person", "name": "...", "url": "..." }', metadata: { author } };
    }
    const publisher = article.publisher;
    if (!publisher || publisher['@type'] !== 'Organization' || !publisher.name) {
      return { status: CheckStatus.FAIL, score: 0, message: 'Missing publisher.@type=Organization with name', suggestion: 'Add publisher: { "@type": "Organization", "name": "..." }', metadata: { publisher } };
    }
    const dm = article.dateModified;
    if (dm) {
      const ageDays = Math.floor((this.now().getTime() - new Date(dm).getTime()) / 86_400_000);
      if (ageDays > FRESH_DAYS) {
        return { status: CheckStatus.WARN, score: 50, message: `dateModified is ${ageDays} days old`, suggestion: 'Update dateModified when revising the article.', metadata: { author: author.name, publisher: publisher.name, dateModified: dm, ageDays } };
      }
    }
    return { status: CheckStatus.PASS, score: 100, message: 'Author + publisher markup present', suggestion: null, metadata: { author: author.name, publisher: publisher.name, dateModified: dm } };
  }
}

import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

const TLD_WHITELIST = ['.gov', '.edu', '.gov.vn', '.edu.vn'];
const HOST_WHITELIST = ['wikipedia.org', 'nih.gov', 'reuters.com', 'bbc.com', 'w3.org', 'who.int', 'nature.com', 'arxiv.org', 'developer.mozilla.org'];

function isAuthoritative(href: string): boolean {
  try {
    const host = new URL(href).hostname.toLowerCase();
    if (TLD_WHITELIST.some((t) => host.endsWith(t))) return true;
    if (HOST_WHITELIST.some((h) => host === h || host.endsWith('.' + h))) return true;
    return false;
  } catch {
    return false;
  }
}

export class CitationOutboundRule implements ISeoRule {
  readonly id = 'geo_citation_outbound';
  readonly category = IssueCategory.GEO;

  check(pageData: PageData): RuleCheckOutput {
    const links = (pageData.externalLinks ?? []) as Array<{ href: string }>;
    const auth = links.filter((l) => isAuthoritative(l.href));
    const meta = { totalExternal: links.length, authoritative: auth.map((l) => ({ href: l.href, host: new URL(l.href).hostname })) };
    if (auth.length === 0) {
      return { status: CheckStatus.FAIL, score: 0, message: 'No outbound citations to authoritative sources', suggestion: 'Cite ≥3 sources from wikipedia, .gov, .edu, or major publishers.', metadata: meta };
    }
    if (auth.length < 3) {
      return { status: CheckStatus.WARN, score: 50, message: `Only ${auth.length} authoritative citation(s)`, suggestion: 'Add more citations to reach ≥3 for stronger AI trust signals.', metadata: meta };
    }
    return { status: CheckStatus.PASS, score: 100, message: `${auth.length} authoritative citations`, suggestion: null, metadata: meta };
  }
}

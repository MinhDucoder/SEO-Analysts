/**
 * @file Maps each rule id to its public-API metadata: severity level,
 * target audiences, and a documentation URL. Unknown rule ids fall back
 * to sensible defaults (severity=info, audience=dev) so adding a new
 * rule code-first never crashes the public API — it just appears with
 * default metadata until this map is updated.
 */
import { Injectable } from '@nestjs/common';
import { IssueAudience, IssueSeverity } from '@repo/shared';

export interface RuleMetadata {
  severity: IssueSeverity;
  audiences: IssueAudience[];
  docRef?: string;
}

const DOC_BASE = process.env.SEO_DOCS_BASE_URL ?? 'https://docs.seo-analyst.vn';

const METADATA: Record<string, Omit<RuleMetadata, 'docRef'>> = {
  // Meta
  title_tag: { severity: 'warning', audiences: ['writer', 'dev'] },
  meta_description: { severity: 'warning', audiences: ['writer', 'dev'] },
  open_graph: { severity: 'info', audiences: ['dev'] },
  twitter_card: { severity: 'info', audiences: ['dev'] },
  // Headings
  h1_tag: { severity: 'error', audiences: ['writer', 'dev'] },
  heading_hierarchy: { severity: 'warning', audiences: ['writer', 'dev'] },
  // Content
  readability: { severity: 'warning', audiences: ['writer'] },
  // Images
  image_alt: { severity: 'error', audiences: ['writer', 'dev'] },
  image_optimization: { severity: 'warning', audiences: ['dev'] },
  // Links
  internal_links: { severity: 'info', audiences: ['writer', 'dev'] },
  external_links: { severity: 'info', audiences: ['writer'] },
  broken_links: { severity: 'error', audiences: ['dev'] },
  // Technical
  canonical_url: { severity: 'warning', audiences: ['dev'] },
  robots_meta: { severity: 'warning', audiences: ['dev'] },
  viewport_meta: { severity: 'warning', audiences: ['dev'] },
  language_tag: { severity: 'info', audiences: ['dev'] },
  schema_org: { severity: 'info', audiences: ['dev'] },
  favicon: { severity: 'info', audiences: ['dev'] },
  http_status: { severity: 'error', audiences: ['dev'] },
  https_check: { severity: 'warning', audiences: ['dev'] },
  url_structure: { severity: 'info', audiences: ['dev'] },
  // Performance
  page_size: { severity: 'warning', audiences: ['dev'] },
};

@Injectable()
export class RuleMetadataService {
  get(ruleId: string): RuleMetadata {
    const known = METADATA[ruleId];
    if (!known) {
      return { severity: 'info', audiences: ['dev'] };
    }
    return { ...known, docRef: `${DOC_BASE}/rules/${ruleId}` };
  }
}

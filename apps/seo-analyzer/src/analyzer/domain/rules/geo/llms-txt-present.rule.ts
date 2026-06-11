import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

const MAX_SIZE = 1_000_000;

export class LlmsTxtPresentRule implements ISeoRule {
  readonly id = 'geo_llms_txt_present';
  readonly category = IssueCategory.GEO;

  check(pageData: PageData): RuleCheckOutput {
    const t = pageData.llmsTxt;
    if (!t || t.status !== 200) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: t ? `llms.txt returned ${t.status}` : 'llms.txt not fetched',
        suggestion: 'Create /llms.txt — a Markdown file with an H1 site name and a blockquote summary. See https://llmstxt.org/',
        metadata: { url: t?.url, status: t?.status ?? null },
      };
    }
    if (!t.h1) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'llms.txt present but missing required H1',
        suggestion: 'The first non-empty line must be "# Site Name".',
        metadata: { url: t.url, sizeBytes: t.sizeBytes },
      };
    }
    if (t.sizeBytes > MAX_SIZE) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `llms.txt is ${(t.sizeBytes / 1024).toFixed(0)} KB (>1 MB)`,
        suggestion: 'Trim non-essential sections; LLM context windows favor compact summaries.',
        metadata: { url: t.url, sizeBytes: t.sizeBytes, h1: t.h1 },
      };
    }
    if (!t.summary) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: 'llms.txt has H1 but no blockquote summary',
        suggestion: 'Add a "> One-line summary" right after the H1.',
        metadata: { url: t.url, h1: t.h1 },
      };
    }
    return {
      status: CheckStatus.PASS,
      score: 100,
      message: 'llms.txt is valid (H1 + summary present)',
      suggestion: null,
      metadata: { url: t.url, h1: t.h1, summary: t.summary, sectionCount: t.sectionCount },
    };
  }
}

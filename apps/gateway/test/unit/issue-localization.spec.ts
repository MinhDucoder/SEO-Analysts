import { describe, it, expect } from 'vitest';
import {
  localizeIssueMessage,
  localizeTemplateSuggestion,
  LOCALIZED_RULE_IDS,
} from '../../src/public-api/i18n/issue-localization';

// The 26 rules that run in content_only mode (no `requires`). Source of truth:
// apps/seo-analyzer/src/analyzer/domain/rules/**. Excluded (have `requires`):
// image_optimization, broken_links, http_status, page_size.
const CONTENT_MODE_RULE_IDS = [
  'readability',
  'geo_ai_bot_access',
  'geo_article_schema',
  'geo_citation_outbound',
  'geo_direct_answer_intro',
  'geo_entity_markup',
  'geo_llms_txt_present',
  'geo_quotable_density',
  'geo_semantic_completeness',
  'h1_tag',
  'heading_hierarchy',
  'image_alt',
  'external_links',
  'internal_links',
  'meta_description',
  'open_graph',
  'title_tag',
  'twitter_card',
  'canonical_url',
  'favicon',
  'https_check',
  'language_tag',
  'robots_meta',
  'schema_org',
  'url_structure',
  'viewport_meta',
];

describe('issue-localization', () => {
  it('covers every content-mode rule id (catches drift when a rule is added)', () => {
    for (const id of CONTENT_MODE_RULE_IDS) {
      expect(LOCALIZED_RULE_IDS.has(id), `missing vi entry for "${id}"`).toBe(true);
    }
  });

  it('has no orphaned vi entries (every localized id is an expected content-mode rule)', () => {
    for (const id of LOCALIZED_RULE_IDS) {
      expect(CONTENT_MODE_RULE_IDS, `orphaned vi entry "${id}"`).toContain(id);
    }
  });

  it('interpolates numeric evidence and keeps technical terms English', () => {
    const msg = localizeIssueMessage('title_tag', 'fail', { length: 53 });
    expect(msg).toContain('53');
    expect(msg).toMatch(/title/i); // technical term stays English
  });

  it('handles the "missing" sub-branch via evidence', () => {
    expect(localizeIssueMessage('title_tag', 'fail', { length: 0 })).toContain('Thiếu');
    expect(localizeIssueMessage('meta_description', 'fail', { length: 0 })).toContain(
      'meta description',
    );
  });

  it('localizes image_alt percent for warn + fail', () => {
    expect(localizeIssueMessage('image_alt', 'warn', { percent: 80 })).toContain('80%');
    expect(localizeIssueMessage('image_alt', 'fail', { percent: 40 })).toContain('alt text');
  });

  it('returns a Vietnamese template suggestion for a known rule', () => {
    const s = localizeTemplateSuggestion('title_tag', 'fail', { length: 0 });
    expect(s).toBeTypeOf('string');
    expect(s).toMatch(/50.?60/); // "50–60 ký tự"
  });

  it('returns null for an unknown rule id (caller falls back to English)', () => {
    expect(localizeIssueMessage('not_a_rule', 'fail', {})).toBeNull();
    expect(localizeTemplateSuggestion('not_a_rule', 'fail', {})).toBeNull();
  });

  it('never prints undefined when an expected evidence key is absent', () => {
    expect(localizeIssueMessage('title_tag', 'fail', {})).not.toContain('undefined');
    expect(localizeIssueMessage('image_alt', 'warn', {})).not.toContain('undefined');
  });

  describe('geo rule sub-branches', () => {
    it('geo_llms_txt_present: not-fetched / missing-H1 / oversize / no-summary', () => {
      expect(localizeIssueMessage('geo_llms_txt_present', 'fail', { status: 404 })).toContain('404');
      expect(localizeIssueMessage('geo_llms_txt_present', 'fail', {})).toContain('chưa được tải');
      expect(localizeIssueMessage('geo_llms_txt_present', 'fail', { sizeBytes: 1200 })).toContain('H1');
      expect(localizeIssueMessage('geo_llms_txt_present', 'warn', { sizeBytes: 2_000_000 })).toContain('KB');
      expect(localizeIssueMessage('geo_llms_txt_present', 'warn', { sizeBytes: 500, h1: 'x' })).toContain('blockquote');
    });

    it('geo_direct_answer_intro: fail vs LLM-error warn vs no-H1 warn', () => {
      expect(localizeTemplateSuggestion('geo_direct_answer_intro', 'fail', {})).toBeTypeOf('string');
      expect(localizeTemplateSuggestion('geo_direct_answer_intro', 'warn', { error: 'boom' })).toBeNull();
      expect(localizeIssueMessage('geo_direct_answer_intro', 'warn', {})).toContain('H1');
    });

    it('geo_article_schema: no-schema fail vs missing-fields fail vs single-field warn', () => {
      expect(localizeIssueMessage('geo_article_schema', 'fail', {})).toContain('JSON-LD');
      expect(localizeIssueMessage('geo_article_schema', 'fail', { missingFields: ['author', 'datePublished'] })).toContain('2');
      expect(localizeIssueMessage('geo_article_schema', 'warn', { missingFields: ['author'] })).toContain('author');
    });

    it('geo_semantic_completeness: no-H2 warn vs percent warn vs fail', () => {
      expect(localizeIssueMessage('geo_semantic_completeness', 'warn', {})).toContain('H2');
      expect(localizeIssueMessage('geo_semantic_completeness', 'warn', { completionRate: 0.6 })).toContain('60%');
      expect(localizeIssueMessage('geo_semantic_completeness', 'fail', { completionRate: 0.3 })).toContain('30%');
    });

    it('geo_ai_bot_access + geo_citation_outbound interpolate counts safely', () => {
      expect(localizeIssueMessage('geo_ai_bot_access', 'fail', { blockedBots: ['GPTBot', 'ClaudeBot'] })).toContain('GPTBot');
      expect(localizeIssueMessage('geo_citation_outbound', 'warn', { authoritative: [{}, {}] })).toContain('2');
      expect(localizeIssueMessage('geo_ai_bot_access', 'fail', {})).not.toContain('undefined');
    });
  });
});

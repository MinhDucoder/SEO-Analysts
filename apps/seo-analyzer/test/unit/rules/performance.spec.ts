import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { PageSizeRule } from '../../../src/analyzer/domain/rules/performance/page-size.rule';
import { registerAllRules } from '../../../src/analyzer/domain/rules';
import { RuleRegistry } from '../../../src/analyzer/services/rule-registry';
import { makePageData } from '../../fixtures/page-data.fixture';

const MB = 1024 * 1024;

describe('PageSizeRule', () => {
  const rule = new PageSizeRule();
  it('PASS <2MB', () => {
    expect(rule.check(makePageData({ htmlSizeBytes: 1 * MB })).status).toBe(CheckStatus.PASS);
  });
  it('WARN 2-5MB', () => {
    expect(rule.check(makePageData({ htmlSizeBytes: 3 * MB })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL >5MB', () => {
    expect(rule.check(makePageData({ htmlSizeBytes: 6 * MB })).status).toBe(CheckStatus.FAIL);
  });
});

describe('registerAllRules', () => {
  it('registers all 20 SEO rules with unique ids', () => {
    const registry = new RuleRegistry();
    registerAllRules(registry);
    const all = registry.getAll();
    expect(all).toHaveLength(20);
    const ids = new Set(all.map((r) => r.id));
    expect(ids.size).toBe(20);
    // Sanity: each seeded rule name must be registered
    const expected = [
      'title_tag', 'meta_description', 'open_graph', 'twitter_card',
      'h1_tag', 'heading_hierarchy',
      'image_alt', 'image_optimization',
      'internal_links', 'external_links',
      'canonical_url', 'robots_meta', 'viewport_meta', 'https_check',
      'schema_org', 'http_status', 'url_structure', 'language_tag', 'favicon',
      'page_size',
    ];
    for (const name of expected) {
      expect(registry.get(name), `missing rule ${name}`).toBeDefined();
    }
  });
});

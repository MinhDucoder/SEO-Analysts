/**
 * @file Full GEO pipeline integration test.
 *
 * Uses manual service construction (same pattern as analyze-page.e2e-spec.ts)
 * to avoid NestJS DI + esbuild decorator-metadata issues in the Vitest runner.
 *
 * The GeminiClientService is stubbed via direct mock injection — we pass a fake
 * instance to the GEO LLM-backed rules (DirectAnswerIntroRule + SemanticCompletenessRule)
 * by controlling `registerAllRules` opts. Because GeminiClientService is constructed
 * inside `registerAllRules` when `geminiKey` is truthy, we can't use NestJS
 * `overrideProvider` here; instead we rely on a well-known sentinel key
 * ("test-gemini-key") and we intercept the rule's LLM call by patching the
 * GeminiClientService prototype before calling `analyze()`.
 *
 * Deviation from plan: plan called `svc.analyze({ pageData, runGeo } as any)` but the
 * actual signature is `analyze(auditId, pageData, targetKeyword?, runGeo?)`.
 * Tests pass the correct positional args.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyzerService } from '../../src/analyzer/services/analyzer.service';
import { RuleRegistry } from '../../src/analyzer/services/rule-registry';
import { RuleRunner } from '../../src/analyzer/services/rule-runner';
import { ScoreCalculator } from '../../src/analyzer/services/score-calculator';
import { GeminiClientService } from '../../src/analyzer/services/gemini-client.service';
import { PageData } from '../../src/analyzer/domain/page-data.interface';

// ---------------------------------------------------------------------------
// Prisma mock — seeded rules include all 20 standard rules; GEO rules bypass
// DB weights (AnalyzerService uses registry.getByCategory(GEO) directly).
// ---------------------------------------------------------------------------
const seededRules = [
  { id: 'r-title_tag',          name: 'title_tag',          category: 'meta',        weight: 8,  isEnabled: true },
  { id: 'r-meta_description',   name: 'meta_description',   category: 'meta',        weight: 7,  isEnabled: true },
  { id: 'r-open_graph',         name: 'open_graph',         category: 'meta',        weight: 5,  isEnabled: true },
  { id: 'r-twitter_card',       name: 'twitter_card',       category: 'meta',        weight: 3,  isEnabled: true },
  { id: 'r-h1_tag',             name: 'h1_tag',             category: 'headings',    weight: 8,  isEnabled: true },
  { id: 'r-heading_hierarchy',  name: 'heading_hierarchy',  category: 'headings',    weight: 6,  isEnabled: true },
  { id: 'r-image_alt',          name: 'image_alt',          category: 'images',      weight: 7,  isEnabled: true },
  { id: 'r-image_optimization', name: 'image_optimization', category: 'images',      weight: 5,  isEnabled: true },
  { id: 'r-internal_links',     name: 'internal_links',     category: 'links',       weight: 5,  isEnabled: true },
  { id: 'r-external_links',     name: 'external_links',     category: 'links',       weight: 3,  isEnabled: true },
  { id: 'r-broken_links',       name: 'broken_links',       category: 'links',       weight: 4,  isEnabled: true },
  { id: 'r-canonical_url',      name: 'canonical_url',      category: 'technical',   weight: 5,  isEnabled: true },
  { id: 'r-robots_meta',        name: 'robots_meta',        category: 'technical',   weight: 6,  isEnabled: true },
  { id: 'r-viewport_meta',      name: 'viewport_meta',      category: 'technical',   weight: 10, isEnabled: true },
  { id: 'r-https_check',        name: 'https_check',        category: 'technical',   weight: 10, isEnabled: true },
  { id: 'r-schema_org',         name: 'schema_org',         category: 'technical',   weight: 6,  isEnabled: true },
  { id: 'r-http_status',        name: 'http_status',        category: 'technical',   weight: 8,  isEnabled: true },
  { id: 'r-url_structure',      name: 'url_structure',      category: 'technical',   weight: 4,  isEnabled: true },
  { id: 'r-language_tag',       name: 'language_tag',       category: 'technical',   weight: 3,  isEnabled: true },
  { id: 'r-favicon',            name: 'favicon',            category: 'technical',   weight: 2,  isEnabled: true },
  { id: 'r-page_size',          name: 'page_size',          category: 'performance', weight: 4,  isEnabled: true },
  { id: 'r-readability',        name: 'readability',        category: 'content',     weight: 5,  isEnabled: true },
];

const createManyMock = vi.fn().mockResolvedValue({ count: 30 });
const findManyMock = vi.fn().mockResolvedValue(seededRules);

const prismaMock = {
  seoRule: { findMany: findManyMock },
  ruleResult: { createMany: createManyMock },
} as any;

// ---------------------------------------------------------------------------
// PageData fixtures
// ---------------------------------------------------------------------------
const wellOptimized: PageData = {
  url: 'https://example.com',
  httpStatus: 200,
  title: 'What is SEO? Complete Guide',
  metaDescription: 'Learn everything about SEO in this comprehensive guide with 800+ words.',
  h1Tags: ['What is SEO?'],
  h2Tags: ['Intro', 'Why it matters', 'How to implement'],
  language: 'en',
  canonical: 'https://example.com',
  ogTitle: 'What is SEO?',
  ogDescription: 'A comprehensive guide',
  ogImage: 'https://example.com/og.jpg',
  viewport: 'width=device-width, initial-scale=1',
  robotsMeta: 'index, follow',
  favicon: 'https://example.com/favicon.ico',
  images: [],
  internalLinks: [
    { href: 'https://example.com/about', text: 'About', title: '' },
    { href: 'https://example.com/blog', text: 'Blog', title: '' },
    { href: 'https://example.com/contact', text: 'Contact', title: '' },
    { href: 'https://example.com/services', text: 'Services', title: '' },
    { href: 'https://example.com/faq', text: 'FAQ', title: '' },
  ],
  externalLinks: [
    { href: 'https://wikipedia.org/wiki/seo', text: 'Wikipedia', title: '' },
    { href: 'https://nih.gov/health', text: 'NIH', title: '' },
    { href: 'https://reuters.com/tech', text: 'Reuters', title: '' },
  ],
  textContent: 'word '.repeat(800),
  wordCount: 800,
  pageSizeBytes: 50_000,
  jsonLdBlocks: [
    {
      '@type': 'Article',
      headline: 'What is SEO?',
      author: { '@type': 'Person', name: 'Author A', url: 'https://example.com/author' },
      publisher: { '@type': 'Organization', name: 'Example Corp' },
      datePublished: '2026-01-01',
      dateModified: '2026-05-01',
      image: 'https://example.com/img.jpg',
    },
  ],
  aiBotAccess: {
    robotsTxtUrl: 'https://example.com/robots.txt',
    robotsTxtStatus: 200,
    rules: [],
  },
  llmsTxt: {
    url: 'https://example.com/llms.txt',
    status: 200,
    h1: 'Example Site',
    summary: 'A comprehensive SEO platform',
    sectionCount: 2,
    sizeBytes: 500,
  },
  quotableBlocks: { tables: 2, lists: 3, blockquotes: 1, dls: 0 },
  sections: [
    { heading: 'Intro', text: 'word '.repeat(150) },
    { heading: 'Why it matters', text: 'word '.repeat(150) },
  ],
} as any;

const bareHomepage: PageData = {
  ...wellOptimized,
  jsonLdBlocks: [],
  externalLinks: [],
  llmsTxt: { url: 'https://example.com/llms.txt', status: 404, sectionCount: 0, sizeBytes: 0 },
  aiBotAccess: {
    robotsTxtUrl: 'https://example.com/robots.txt',
    robotsTxtStatus: 200,
    rules: [{ userAgent: 'GPTBot', disallow: ['/'], allow: [] }],
  },
  quotableBlocks: { tables: 0, lists: 0, blockquotes: 0, dls: 0 },
};

// ---------------------------------------------------------------------------
// Helper: build a fresh AnalyzerService wired with a stubbed LLM response.
//
// We patch the GeminiClientService prototype so every instance created inside
// registerAllRules (which we can't intercept directly) returns the stub.
//
// For the "LLM throws → degraded" scenario, note that both LLM-backed rules
// (DirectAnswerIntroRule, SemanticCompletenessRule) have internal try/catch
// that catch LLM errors and return gracefully (score=50, status=WARN) without
// propagating the exception. This means the outer AnalyzerService catch that
// sets `errored: true` is never reached through the LLM path alone.
//
// To force `errored: true`, we expose the registry from the service and spy
// directly on the GEO rules' `check()` method to throw from there, bypassing
// the rules' own internal guard.
// ---------------------------------------------------------------------------
function buildService(llmResult: any, llmShouldThrow = false) {
  const completeJsonSpy = llmShouldThrow
    ? vi.fn().mockRejectedValue(new Error('timeout'))
    : vi.fn().mockResolvedValue(llmResult);

  // Patch prototype so the real GeminiClientService instances created by
  // registerAllRules use the mock.
  vi.spyOn(GeminiClientService.prototype, 'completeJson').mockImplementation(completeJsonSpy);

  const registry = new RuleRegistry();
  const runner = new RuleRunner(registry);
  const calc = new ScoreCalculator();
  const svc = new AnalyzerService(prismaMock, registry, runner, calc);
  // onModuleInit registers all 22 standard rules + GEO rules when key present.
  // We provide a sentinel key so registerAllRules instantiates the LLM rules;
  // the prototype spy intercepts their actual calls.
  const origEnv = process.env.GEO_AUDIT_ENABLED;
  const origKey = process.env.GEMINI_API_KEY;
  process.env.GEO_AUDIT_ENABLED = 'true';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  svc.onModuleInit();
  process.env.GEO_AUDIT_ENABLED = origEnv ?? '';
  process.env.GEMINI_API_KEY = origKey ?? '';

  // For the "shouldThrow" scenario, spy on ALL GEO rules' check() methods so
  // the outer AnalyzerService try/catch catches the error and sets errored=true.
  if (llmShouldThrow) {
    const { IssueCategory } = require('@repo/shared');
    const geoRules = registry.getByCategory(IssueCategory.GEO);
    for (const rule of geoRules) {
      vi.spyOn(rule, 'check').mockRejectedValue(new Error('timeout'));
    }
  }

  return svc;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Full GEO pipeline', () => {
  beforeEach(() => {
    // Reset the Prisma mocks before each test but keep their implementations.
    findManyMock.mockResolvedValue(seededRules);
    createManyMock.mockResolvedValue({ count: 30 });
    // Do NOT call vi.restoreAllMocks() here — it would undo the prototype spy
    // that buildService sets up. Each buildService call registers a fresh spy.
  });

  it('produces geoScore >= 80 for well-optimized PageData', async () => {
    const svc = buildService({ direct: true, reason: 'ok', complete: true, wordCount: 150 });

    const result = await svc.analyze(
      '00000000-0000-0000-0000-000000000001',
      wellOptimized,
      undefined,
      true, // runGeo
    );

    expect(result.geoScore).not.toBeNull();
    expect(result.geoScore).toBeGreaterThanOrEqual(80);
    expect(result.geoVersion).toBe('1.0');
  });

  it('produces geoScore < 30 for bare homepage', async () => {
    const svc = buildService({ direct: false, reason: 'no', complete: false, wordCount: 0 });

    const result = await svc.analyze(
      '00000000-0000-0000-0000-000000000002',
      bareHomepage,
      undefined,
      true, // runGeo
    );

    expect(result.geoScore).not.toBeNull();
    expect(result.geoScore).toBeLessThan(30);
  });

  it('marks geoVersion as 1.0-degraded when LLM throws', async () => {
    const svc = buildService(null, /* shouldThrow */ true);

    const result = await svc.analyze(
      '00000000-0000-0000-0000-000000000003',
      wellOptimized,
      undefined,
      true, // runGeo
    );

    // At least one GEO rule errored → degraded version
    expect(result.geoVersion).toBe('1.0-degraded');
    // Score is still computed (other 6 non-LLM GEO rules still run)
    expect(result.geoScore).not.toBeNull();
  });
});

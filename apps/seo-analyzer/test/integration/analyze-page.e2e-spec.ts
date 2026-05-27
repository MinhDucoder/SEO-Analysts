import { describe, expect, it, beforeAll, vi } from 'vitest';
import { AnalyzerController } from '../../src/analyzer/controllers/analyzer.controller';
import { AnalyzerService } from '../../src/analyzer/services/analyzer.service';
import { RuleRegistry } from '../../src/analyzer/services/rule-registry';
import { RuleRunner } from '../../src/analyzer/services/rule-runner';
import { ScoreCalculator } from '../../src/analyzer/services/score-calculator';
import { RuleMetadataService } from '../../src/analyzer/services/rule-metadata.service';
import { makePageData } from '../fixtures/page-data.fixture';
import { Classification, IssueCategory } from '@repo/shared';

// Mocked Prisma — returns the 20 seeded rules and captures createMany
const seededRules = [
  { id: 'r-title_tag',         name: 'title_tag',         category: 'meta',        weight: 8,  displayName: 'Title', description: '', isEnabled: true },
  { id: 'r-meta_description',  name: 'meta_description',  category: 'meta',        weight: 7,  displayName: 'Desc',  description: '', isEnabled: true },
  { id: 'r-open_graph',        name: 'open_graph',        category: 'meta',        weight: 5,  displayName: 'OG',    description: '', isEnabled: true },
  { id: 'r-twitter_card',      name: 'twitter_card',      category: 'meta',        weight: 3,  displayName: 'TW',    description: '', isEnabled: true },
  { id: 'r-h1_tag',            name: 'h1_tag',            category: 'headings',    weight: 8,  displayName: 'H1',    description: '', isEnabled: true },
  { id: 'r-heading_hierarchy', name: 'heading_hierarchy', category: 'headings',    weight: 6,  displayName: 'HH',    description: '', isEnabled: true },
  { id: 'r-image_alt',         name: 'image_alt',         category: 'images',      weight: 7,  displayName: 'Alt',   description: '', isEnabled: true },
  { id: 'r-image_optimization',name: 'image_optimization',category: 'images',      weight: 5,  displayName: 'IOpt',  description: '', isEnabled: true },
  { id: 'r-internal_links',    name: 'internal_links',    category: 'links',       weight: 5,  displayName: 'IL',    description: '', isEnabled: true },
  { id: 'r-external_links',    name: 'external_links',    category: 'links',       weight: 3,  displayName: 'EL',    description: '', isEnabled: true },
  { id: 'r-canonical_url',     name: 'canonical_url',     category: 'technical',   weight: 5,  displayName: 'Can',   description: '', isEnabled: true },
  { id: 'r-robots_meta',       name: 'robots_meta',       category: 'technical',   weight: 6,  displayName: 'Rob',   description: '', isEnabled: true },
  { id: 'r-viewport_meta',     name: 'viewport_meta',     category: 'technical',   weight: 10, displayName: 'VP',    description: '', isEnabled: true },
  { id: 'r-https_check',       name: 'https_check',       category: 'technical',   weight: 10, displayName: 'HT',    description: '', isEnabled: true },
  { id: 'r-schema_org',        name: 'schema_org',        category: 'technical',   weight: 6,  displayName: 'SO',    description: '', isEnabled: true },
  { id: 'r-http_status',       name: 'http_status',       category: 'technical',   weight: 8,  displayName: 'HS',    description: '', isEnabled: true },
  { id: 'r-url_structure',     name: 'url_structure',     category: 'technical',   weight: 4,  displayName: 'URL',   description: '', isEnabled: true },
  { id: 'r-language_tag',      name: 'language_tag',      category: 'technical',   weight: 3,  displayName: 'Lang',  description: '', isEnabled: true },
  { id: 'r-favicon',           name: 'favicon',           category: 'technical',   weight: 2,  displayName: 'Fav',   description: '', isEnabled: true },
  { id: 'r-page_size',         name: 'page_size',         category: 'performance', weight: 4,  displayName: 'PS',    description: '', isEnabled: true },
];

const createManyMock = vi.fn().mockResolvedValue({ count: 20 });
const findManyMock = vi.fn().mockResolvedValue(seededRules);
const updateMock = vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: { weight: number } }) => ({
  ...seededRules.find((r) => r.id === where.id),
  ...data,
}));

const prismaMock = {
  seoRule: { findMany: findManyMock, update: updateMock },
  ruleResult: { createMany: createManyMock },
} as any;

describe('AnalyzePage E2E', () => {
  let controller: AnalyzerController;

  beforeAll(() => {
    // Manually wire dependencies to avoid NestJS DI + esbuild decorator issues
    const registry = new RuleRegistry();
    const runner = new RuleRunner(registry);
    const calc = new ScoreCalculator();
    const service = new AnalyzerService(prismaMock, registry, runner, calc);
    // Manually call onModuleInit to register all 20 rules
    service.onModuleInit();
    const ruleMetadata = new RuleMetadataService();
    controller = new AnalyzerController(service, registry, ruleMetadata);
  });

  it('analyzes a healthy page and returns excellent classification', async () => {
    createManyMock.mockClear();
    findManyMock.mockResolvedValueOnce(seededRules);

    const response = await controller.analyzePage({
      auditId: '00000000-0000-0000-0000-000000000001',
      pageData: makePageData(),
    });

    // Wire format is camelCase — proto-loader runs with `keepCase: false`, so
    // snake_case keys (audit_id, rule_results, overall_score) are silently
    // dropped during serialization. Asserting camelCase is what guards the
    // crawler's site-audit path from receiving empty ruleResults / score 0.
    expect(response.auditId).toBe('00000000-0000-0000-0000-000000000001');
    expect(response.ruleResults.length).toBe(20);
    expect(response.categoryScores.length).toBeGreaterThanOrEqual(5);
    expect(response.overallScore).toBeGreaterThanOrEqual(80);
    expect(response.classification).toBe(Classification.EXCELLENT);
    expect(createManyMock).toHaveBeenCalledOnce();
  });

  it('returns poor classification when page is broken', async () => {
    findManyMock.mockResolvedValueOnce(seededRules);

    const bad = makePageData({
      title: undefined,
      metaDescription: undefined,
      h1Tags: [],
      images: [{ src: '/a.jpg', alt: null, sizeBytes: 800_000, format: 'jpeg' }],
      internalLinks: [],
      canonicalUrl: undefined,
      isHttps: false,
      viewportContent: undefined,
      schemaJsonLd: [],
      language: undefined,
      faviconUrl: undefined,
      htmlSizeBytes: 10 * 1024 * 1024,
      statusCode: 500,
      openGraph: {},
      twitterCard: {},
    });

    const response = await controller.analyzePage({
      auditId: '00000000-0000-0000-0000-000000000002',
      pageData: bad,
    });

    expect(response.overallScore).toBeLessThan(40);
    expect(response.classification).toBe(Classification.POOR);
  });

  it('ListRules returns 20 rules', async () => {
    findManyMock.mockResolvedValueOnce(seededRules);
    const res = await controller.listRules();
    expect(res.rules).toHaveLength(20);
  });

  it('GetRulesByCategory filters correctly', async () => {
    findManyMock.mockResolvedValueOnce(
      seededRules.filter((r) => r.category === 'meta'),
    );
    const res = await controller.getRulesByCategory({ category: IssueCategory.META });
    // mapRuleToProto normalises Prisma's lowercase enum to the proto
    // IssueCategory symbol — proto-loader's `enums: String` expects this.
    expect(res.rules.every((r) => r.category === 'ISSUE_CATEGORY_META')).toBe(true);
  });

  it('ListRules emits camelCase displayName + isEnabled (proto-loader wire format)', async () => {
    findManyMock.mockResolvedValueOnce(seededRules);
    const res = await controller.listRules();
    const row = res.rules[0];
    expect(row.displayName).toBeTypeOf('string');
    expect(row.isEnabled).toBe(true);
    // Snake_case variants must NOT exist — proto-loader silently drops them.
    expect((row as Record<string, unknown>).display_name).toBeUndefined();
    expect((row as Record<string, unknown>).is_enabled).toBeUndefined();
  });

  it('UpdateRuleWeight rejects out-of-range weight', async () => {
    await expect(
      controller.updateRuleWeight({ ruleId: 'r-title_tag', newWeight: 42 }),
    ).rejects.toThrow(/between 1 and 10/);
  });

  it('UpdateRuleEnabled toggles isEnabled', async () => {
    updateMock.mockImplementationOnce(({ where, data }: any) => ({
      ...seededRules.find((r) => r.id === where.id),
      ...data,
    }));
    const res = await controller.updateRuleEnabled({
      ruleId: 'r-title_tag',
      isEnabled: false,
    });
    expect(res.rule.isEnabled).toBe(false);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'r-title_tag' },
      data: { isEnabled: false },
    });
  });

  it('HealthCheck returns healthy', () => {
    const res = controller.healthCheck();
    expect(res.healthy).toBe(true);
    expect(typeof res.version).toBe('string');
  });
});

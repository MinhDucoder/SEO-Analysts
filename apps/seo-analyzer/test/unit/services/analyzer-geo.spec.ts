/**
 * Task 20: Verify AnalyzerService correctly handles runGeo flag,
 * runs GEO rules, computes geoScore, and marks geoVersion.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { AnalyzerService } from '../../../src/analyzer/services/analyzer.service';
import { RuleRegistry } from '../../../src/analyzer/services/rule-registry';
import { RuleRunner } from '../../../src/analyzer/services/rule-runner';
import { ScoreCalculator } from '../../../src/analyzer/services/score-calculator';
import { ISeoRule, RuleCheckOutput } from '../../../src/analyzer/domain/seo-rule.interface';

// Minimal GEO rule mock (sync)
function makeGeoRule(id: string, status: CheckStatus, score: number): ISeoRule {
  return {
    id,
    category: IssueCategory.GEO,
    check: () => ({
      status,
      score,
      message: 'test',
      suggestion: null,
      metadata: {},
    }),
  };
}

// GEO rule that throws (simulates LLM failure)
function makeErrorGeoRule(id: string): ISeoRule {
  return {
    id,
    category: IssueCategory.GEO,
    check: () => { throw new Error('LLM timeout'); },
  };
}

function buildService(geoRules: ISeoRule[] = []) {
  const registry = new RuleRegistry();
  const runner = new RuleRunner(registry);

  const mockPrisma = {
    seoRule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    ruleResult: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };

  const calc = new ScoreCalculator();

  const svc = new AnalyzerService(
    mockPrisma as any,
    registry,
    runner,
    calc,
  );

  // Register GEO rules directly on the registry for test
  for (const rule of geoRules) {
    registry.register(rule);
  }

  return svc;
}

describe('AnalyzerService — GEO batch (Task 20)', () => {
  it('returns geoScore=null when runGeo=false', async () => {
    const svc = buildService([makeGeoRule('geo_ai_bot_access', CheckStatus.PASS, 100)]);
    const result = await svc.analyze('audit-1', { url: 'https://x' } as any, undefined, false);
    expect(result.geoScore).toBeNull();
    expect(result.geoVersion).toBeNull();
  });

  it('returns geoScore=100 when runGeo=true and all GEO rules pass', async () => {
    const geoRules = [
      makeGeoRule('geo_ai_bot_access', CheckStatus.PASS, 100),
      makeGeoRule('geo_llms_txt_present', CheckStatus.PASS, 100),
      makeGeoRule('geo_article_schema', CheckStatus.PASS, 100),
      makeGeoRule('geo_entity_markup', CheckStatus.PASS, 100),
      makeGeoRule('geo_quotable_density', CheckStatus.PASS, 100),
      makeGeoRule('geo_citation_outbound', CheckStatus.PASS, 100),
      makeGeoRule('geo_direct_answer_intro', CheckStatus.PASS, 100),
      makeGeoRule('geo_semantic_completeness', CheckStatus.PASS, 100),
    ];
    const svc = buildService(geoRules);
    const result = await svc.analyze('audit-2', { url: 'https://x' } as any, undefined, true);
    expect(result.geoScore).toBe(100);
    expect(result.geoVersion).toBe('1.0');
  });

  it('marks geoVersion=1.0-degraded when a GEO rule throws', async () => {
    const geoRules = [
      makeGeoRule('geo_ai_bot_access', CheckStatus.PASS, 100),
      makeGeoRule('geo_llms_txt_present', CheckStatus.PASS, 100),
      makeGeoRule('geo_article_schema', CheckStatus.PASS, 100),
      makeGeoRule('geo_entity_markup', CheckStatus.PASS, 100),
      makeGeoRule('geo_quotable_density', CheckStatus.PASS, 100),
      makeGeoRule('geo_citation_outbound', CheckStatus.PASS, 100),
      makeErrorGeoRule('geo_direct_answer_intro'), // this one throws
      makeGeoRule('geo_semantic_completeness', CheckStatus.PASS, 100),
    ];
    const svc = buildService(geoRules);
    const result = await svc.analyze('audit-3', { url: 'https://x' } as any, undefined, true);
    expect(result.geoVersion).toBe('1.0-degraded');
  });
});

/**
 * @file Top-level orchestrator for SEO analysis. Loads enabled rules
 * from DB, runs them against the provided PageData, persists per-rule
 * results, and returns aggregated scores + classification.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IssueCategory, Classification, CheckStatus } from '@repo/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RuleRegistry } from './rule-registry';
import { RuleRunner, DbRule, RunnerResult } from './rule-runner';
import { ScoreCalculator, CategoryScore } from './score-calculator';
import { registerAllRules } from '../domain/rules';
import { calculateGeoScore, GeoRuleResultInput } from './geo-score.calculator';
import { PageData } from '../domain/page-data.interface';

export interface AnalyzeResult {
  auditId: string;
  ruleResults: RunnerResult[];
  categoryScores: CategoryScore[];
  overallScore: number;
  classification: Classification;
  geoScore: number | null;
  geoVersion: string | null;
}

@Injectable()
export class AnalyzerService implements OnModuleInit {
  private readonly logger = new Logger(AnalyzerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: RuleRegistry,
    private readonly runner: RuleRunner,
    private readonly calc: ScoreCalculator,
  ) {}

  onModuleInit() {
    this.registry.clear();
    registerAllRules(this.registry, {
      runGeo: process.env.GEO_AUDIT_ENABLED !== 'false',
      geminiKey: process.env.GEMINI_API_KEY ?? process.env.SEO_AI_API_KEY,
    });
    this.logger.log(`Registered ${this.registry.getAll().length} SEO rules`);
  }

  /**
   * Analyze a single page. The DB is the source of truth for rule
   * weights & enabled flags so admins can tune scoring without a deploy.
   *
   * @returns Per-rule results + category breakdown + overall score +
   *   classification. All rule_results rows are persisted in a batch.
   */
  async analyze(auditId: string, pageData: PageData, targetKeyword?: string, runGeo?: boolean): Promise<AnalyzeResult> {
    const dbRows = await this.prisma.seoRule.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
    });
    const dbRules: DbRule[] = dbRows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category as unknown as IssueCategory,
      weight: r.weight,
    }));

    const results = await this.runner.runAll(pageData, dbRules, targetKeyword);

    // Conditional GEO batch — runs registered GEO rules directly (bypasses DB weight lookup)
    const geoResults: GeoRuleResultInput[] = [];
    if (runGeo) {
      const geoRules = this.registry.getByCategory(IssueCategory.GEO);
      for (const rule of geoRules) {
        try {
          const out = await Promise.resolve(rule.check(pageData, targetKeyword));
          geoResults.push({ ruleId: rule.id, status: out.status, score: out.score, weight: 12.5, errored: false });
          // Also include in standard ruleResults so they get persisted
          results.push({
            ruleId: rule.id,
            ruleName: rule.id,
            category: rule.category,
            weight: 12.5,
            status: out.status,
            score: out.score,
            message: out.message,
            suggestion: out.suggestion,
            metadata: out.metadata,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`GEO rule "${rule.id}" threw: ${msg}`);
          geoResults.push({ ruleId: rule.id, status: CheckStatus.WARN, score: 50, weight: 12.5, errored: true });
          results.push({
            ruleId: rule.id,
            ruleName: rule.id,
            category: rule.category,
            weight: 12.5,
            status: CheckStatus.WARN,
            score: 50,
            message: `Rule execution error: ${msg}`,
            suggestion: null,
            metadata: { error: msg },
          });
        }
      }
    }

    const { score: geoScore, version: geoVersion } = calculateGeoScore(geoResults);

    // Persist rule_results rows
    if (results.length > 0) {
      await this.prisma.ruleResult.createMany({
        data: results.map((r) => ({
          auditId,
          ruleId: r.ruleName,
          ruleName: r.ruleName,
          category: r.category as any,
          status: r.status as any,
          score: r.score,
          weight: r.weight,
          message: r.message,
          suggestion: r.suggestion,
          metadata: r.metadata as any,
        })),
      });
    }

    const overallScore = this.calc.overall(results);
    const categoryScores = this.calc.perCategory(results);
    const classification = this.calc.classify(overallScore);

    this.logger.log(
      `Analyzed audit=${auditId} score=${overallScore} (${classification}) rules=${results.length}${runGeo ? ` geoScore=${geoScore}` : ''}`,
    );

    return { auditId, ruleResults: results, categoryScores, overallScore, classification, geoScore, geoVersion };
  }

  listAllRules() {
    return this.prisma.seoRule.findMany({ orderBy: { name: 'asc' } });
  }

  listRulesByCategory(category: string) {
    return this.prisma.seoRule.findMany({
      where: { category: category as any },
      orderBy: { name: 'asc' },
    });
  }

  async updateRuleWeight(ruleId: string, newWeight: number) {
    return this.prisma.seoRule.update({
      where: { id: ruleId },
      data: { weight: newWeight },
    });
  }

  async updateRuleEnabled(ruleId: string, isEnabled: boolean) {
    return this.prisma.seoRule.update({
      where: { id: ruleId },
      data: { isEnabled },
    });
  }
}

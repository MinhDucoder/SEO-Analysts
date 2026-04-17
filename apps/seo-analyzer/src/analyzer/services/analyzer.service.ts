/**
 * @file Top-level orchestrator for SEO analysis. Loads enabled rules
 * from DB, runs them against the provided PageData, persists per-rule
 * results, and returns aggregated scores + classification.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CheckStatus, IssueCategory, Classification } from '@repo/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RuleRegistry } from './rule-registry';
import { RuleRunner, DbRule, RunnerResult } from './rule-runner';
import { ScoreCalculator, CategoryScore } from './score-calculator';
import { registerAllRules } from '../domain/rules';
import { PageData } from '../domain/page-data.interface';

export interface AnalyzeResult {
  auditId: string;
  ruleResults: RunnerResult[];
  categoryScores: CategoryScore[];
  overallScore: number;
  classification: Classification;
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
    registerAllRules(this.registry);
    this.logger.log(`Registered ${this.registry.getAll().length} SEO rules`);
  }

  /**
   * Analyze a single page. The DB is the source of truth for rule
   * weights & enabled flags so admins can tune scoring without a deploy.
   *
   * @returns Per-rule results + category breakdown + overall score +
   *   classification. All rule_results rows are persisted in a batch.
   */
  async analyze(auditId: string, pageData: PageData, targetKeyword?: string): Promise<AnalyzeResult> {
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

    const results = this.runner.runAll(pageData, dbRules, targetKeyword);

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
      `Analyzed audit=${auditId} score=${overallScore} (${classification}) rules=${results.length}`,
    );

    return { auditId, ruleResults: results, categoryScores, overallScore, classification };
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
}

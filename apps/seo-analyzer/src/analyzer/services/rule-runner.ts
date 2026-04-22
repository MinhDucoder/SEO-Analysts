/**
 * @file Executes every enabled rule against a single page.
 * Rule exceptions are caught and converted to FAIL results so one
 * buggy rule cannot abort the whole analysis for an audit.
 */
import { Injectable, Logger } from '@nestjs/common';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { RuleRegistry } from './rule-registry';
import { PageData } from '../domain/page-data.interface';
import {
  ISeoRule,
  RuleCheckOutput,
  RuleRequirement,
} from '../domain/seo-rule.interface';

export interface DbRule {
  id: string;
  name: string;
  category: IssueCategory;
  weight: number;
}

export interface RunnerResult extends RuleCheckOutput {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  weight: number;
}

export type RunMode = 'content_only' | 'full';

/** Result shape for content-only runs (no DB weights; weight defaults to 0). */
export interface ContentRunnerResult extends RuleCheckOutput {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
}

@Injectable()
export class RuleRunner {
  private readonly logger = new Logger(RuleRunner.name);

  constructor(private readonly registry: RuleRegistry) {}

  /**
   * Run every DB-enabled rule that has a matching implementation. Rules
   * missing an impl are skipped with a warn log (DB → code drift detection).
   */
  runAll(pageData: PageData, dbRules: DbRule[], targetKeyword?: string): RunnerResult[] {
    const out: RunnerResult[] = [];
    for (const db of dbRules) {
      const impl = this.registry.get(db.name);
      if (!impl) {
        this.logger.warn(`No implementation registered for rule "${db.name}" — skipping`);
        continue;
      }
      try {
        const result = impl.check(pageData, targetKeyword);
        out.push({
          ruleId: db.id,
          ruleName: db.name,
          category: db.category,
          weight: db.weight,
          ...result,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Rule "${db.name}" threw: ${msg}`);
        out.push({
          ruleId: db.id,
          ruleName: db.name,
          category: db.category,
          weight: db.weight,
          status: CheckStatus.FAIL,
          score: 0,
          message: `Rule execution error: ${msg}`,
          suggestion: null,
          metadata: { error: msg },
        });
      }
    }
    return out;
  }

  /**
   * Run registry rules directly for content-only analysis (no DB-driven
   * selection). Rules whose `requires` isn't satisfied by `mode` are
   * skipped. Used by the public API's AnalyzeContent RPC.
   *
   * Rules with no `requires` are "pure HTML" and always run.
   * content_only mode skips rules requiring http_metadata or performance.
   * full mode runs everything (equivalent to `runAll` over all registered rules).
   */
  runContent(
    pageData: PageData,
    targetKeyword?: string,
    mode: RunMode = 'content_only',
  ): ContentRunnerResult[] {
    const out: ContentRunnerResult[] = [];
    for (const rule of this.registry.getAll()) {
      if (!this.isApplicable(rule, mode)) continue;
      try {
        const result = rule.check(pageData, targetKeyword);
        out.push({
          ruleId: rule.id,
          ruleName: rule.id,
          category: rule.category,
          ...result,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Rule "${rule.id}" threw: ${msg}`);
        out.push({
          ruleId: rule.id,
          ruleName: rule.id,
          category: rule.category,
          status: CheckStatus.FAIL,
          score: 0,
          message: `Rule execution error: ${msg}`,
          suggestion: null,
          metadata: { error: msg },
        });
      }
    }
    return out;
  }

  private isApplicable(rule: ISeoRule, mode: RunMode): boolean {
    if (mode === 'full') return true;
    if (!rule.requires || rule.requires.length === 0) return true;
    // content_only satisfies neither http_metadata nor performance
    return rule.requires.every((req) => this.isRequirementSatisfied(req, mode));
  }

  private isRequirementSatisfied(_req: RuleRequirement, mode: RunMode): boolean {
    return mode === 'full';
  }
}

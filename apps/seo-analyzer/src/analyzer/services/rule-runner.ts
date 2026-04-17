import { Injectable, Logger } from '@nestjs/common';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { RuleRegistry } from './rule-registry';
import { PageData } from '../domain/page-data.interface';
import { RuleCheckOutput } from '../domain/seo-rule.interface';

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

@Injectable()
export class RuleRunner {
  private readonly logger = new Logger(RuleRunner.name);

  constructor(private readonly registry: RuleRegistry) {}

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
}

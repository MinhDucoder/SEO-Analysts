import { Injectable } from '@nestjs/common';
import { IssueCategory } from '@repo/shared';
import { ISeoRule } from './interfaces/seo-rule.interface';

@Injectable()
export class RuleRegistry {
  private readonly rules = new Map<string, ISeoRule>();

  register(rule: ISeoRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule "${rule.id}" is already registered`);
    }
    this.rules.set(rule.id, rule);
  }

  get(id: string): ISeoRule | undefined {
    return this.rules.get(id);
  }

  getAll(): ISeoRule[] {
    return Array.from(this.rules.values());
  }

  getByCategory(category: IssueCategory): ISeoRule[] {
    return this.getAll().filter((r) => r.category === category);
  }

  clear(): void {
    this.rules.clear();
  }
}

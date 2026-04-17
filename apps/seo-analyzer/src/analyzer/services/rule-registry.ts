/**
 * @file In-memory lookup of rule implementations by id.
 * Registry is populated once at module init and never mutated at runtime
 * — safe to share across concurrent requests without synchronization.
 */
import { Injectable } from '@nestjs/common';
import { IssueCategory } from '@repo/shared';
import { ISeoRule } from '../domain/seo-rule.interface';

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

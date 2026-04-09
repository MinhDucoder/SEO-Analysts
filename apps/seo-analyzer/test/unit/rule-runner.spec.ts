import { describe, expect, it, beforeEach } from 'vitest';
import { RuleRegistry } from '../../src/analyzer/rule-registry';
import { RuleRunner } from '../../src/analyzer/rule-runner';
import { ISeoRule, RuleCheckOutput } from '../../src/analyzer/interfaces/seo-rule.interface';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { makePageData } from '../../src/analyzer/test-fixtures/page-data.fixture';

function fakeRule(id: string, category: IssueCategory, status: CheckStatus, score: number): ISeoRule {
  return {
    id,
    category,
    check(): RuleCheckOutput {
      return { status, score, message: `${id}:${status}`, suggestion: null, metadata: {} };
    },
  };
}

describe('RuleRunner', () => {
  let registry: RuleRegistry;
  let runner: RuleRunner;

  beforeEach(() => {
    registry = new RuleRegistry();
    runner = new RuleRunner(registry);
  });

  it('runs every enabled DB rule whose name is in the registry', () => {
    registry.register(fakeRule('title_tag', IssueCategory.META, CheckStatus.PASS, 100));
    registry.register(fakeRule('h1_tag', IssueCategory.HEADINGS, CheckStatus.FAIL, 0));

    const dbRules = [
      { id: 'uuid-1', name: 'title_tag', category: IssueCategory.META, weight: 8 },
      { id: 'uuid-2', name: 'h1_tag', category: IssueCategory.HEADINGS, weight: 8 },
    ];

    const results = runner.runAll(makePageData(), dbRules);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ ruleName: 'title_tag', score: 100, weight: 8 });
    expect(results[1]).toMatchObject({ ruleName: 'h1_tag', score: 0, weight: 8 });
  });

  it('skips DB rules with no registered implementation and logs a warning', () => {
    registry.register(fakeRule('title_tag', IssueCategory.META, CheckStatus.PASS, 100));
    const dbRules = [
      { id: 'u1', name: 'title_tag', category: IssueCategory.META, weight: 8 },
      { id: 'u2', name: 'ghost_rule', category: IssueCategory.META, weight: 5 },
    ];
    const results = runner.runAll(makePageData(), dbRules);
    expect(results).toHaveLength(1);
    expect(results[0].ruleName).toBe('title_tag');
  });

  it('catches rule exceptions and records a fail result', () => {
    const brokenRule: ISeoRule = {
      id: 'broken',
      category: IssueCategory.META,
      check() {
        throw new Error('boom');
      },
    };
    registry.register(brokenRule);
    const dbRules = [{ id: 'u1', name: 'broken', category: IssueCategory.META, weight: 4 }];
    const results = runner.runAll(makePageData(), dbRules);
    expect(results[0].status).toBe(CheckStatus.FAIL);
    expect(results[0].score).toBe(0);
    expect(results[0].message).toMatch(/boom/);
  });
});

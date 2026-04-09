import { describe, expect, it, beforeEach } from 'vitest';
import { RuleRegistry } from '../../src/analyzer/rule-registry';
import { ISeoRule, RuleCheckOutput } from '../../src/analyzer/interfaces/seo-rule.interface';
import { CheckStatus, IssueCategory } from '@repo/shared';

class FakeRule implements ISeoRule {
  constructor(public readonly id: string, public readonly category: IssueCategory) {}
  check(): RuleCheckOutput {
    return { status: CheckStatus.PASS, score: 100, message: 'ok', suggestion: null, metadata: {} };
  }
}

describe('RuleRegistry', () => {
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = new RuleRegistry();
  });

  it('registers a rule and retrieves it by id', () => {
    const rule = new FakeRule('title_tag', IssueCategory.META);
    registry.register(rule);
    expect(registry.get('title_tag')).toBe(rule);
  });

  it('throws when registering duplicate id', () => {
    registry.register(new FakeRule('dup', IssueCategory.META));
    expect(() => registry.register(new FakeRule('dup', IssueCategory.META))).toThrow(
      /already registered/,
    );
  });

  it('returns undefined for unknown id', () => {
    expect(registry.get('nope')).toBeUndefined();
  });

  it('lists all rules via getAll', () => {
    registry.register(new FakeRule('a', IssueCategory.META));
    registry.register(new FakeRule('b', IssueCategory.HEADINGS));
    expect(registry.getAll().map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('filters by category via getByCategory', () => {
    registry.register(new FakeRule('a', IssueCategory.META));
    registry.register(new FakeRule('b', IssueCategory.META));
    registry.register(new FakeRule('c', IssueCategory.HEADINGS));
    expect(registry.getByCategory(IssueCategory.META).map((r) => r.id)).toEqual(['a', 'b']);
  });
});

import { describe, expect, it } from 'vitest';
import { CheckStatus, IssueCategory } from '../src';

describe('CheckStatus enum', () => {
  it('has PASS, WARN, FAIL', () => {
    expect(CheckStatus.PASS).toBe('pass');
    expect(CheckStatus.WARN).toBe('warn');
    expect(CheckStatus.FAIL).toBe('fail');
  });
});

describe('IssueCategory enum', () => {
  it('has the 7 base categories', () => {
    expect(IssueCategory.META).toBe('meta');
    expect(IssueCategory.HEADINGS).toBe('headings');
    expect(IssueCategory.IMAGES).toBe('images');
    expect(IssueCategory.LINKS).toBe('links');
    expect(IssueCategory.PERFORMANCE).toBe('performance');
    expect(IssueCategory.TECHNICAL).toBe('technical');
    expect(IssueCategory.CONTENT).toBe('content');
  });

  it('has GEO for AI Visibility rules', () => {
    expect(IssueCategory.GEO).toBe('geo');
  });
});

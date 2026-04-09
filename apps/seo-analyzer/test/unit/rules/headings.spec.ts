import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { H1TagRule } from '../../../src/analyzer/rules/headings/h1-tag.rule';
import { HeadingHierarchyRule } from '../../../src/analyzer/rules/headings/heading-hierarchy.rule';
import { makePageData } from '../../../src/analyzer/test-fixtures/page-data.fixture';

describe('H1TagRule', () => {
  const rule = new H1TagRule();
  it('PASS exactly 1 H1 and contains keyword', () => {
    const res = rule.check(makePageData({ h1Tags: ['Best Gaming Laptops 2026'] }), 'gaming laptops');
    expect(res.status).toBe(CheckStatus.PASS);
  });
  it('PASS exactly 1 H1 when no keyword is provided', () => {
    expect(rule.check(makePageData({ h1Tags: ['Heading'] })).status).toBe(CheckStatus.PASS);
  });
  it('WARN exactly 1 H1 but missing keyword', () => {
    const res = rule.check(makePageData({ h1Tags: ['About Us'] }), 'laptops');
    expect(res.status).toBe(CheckStatus.WARN);
  });
  it('FAIL zero H1', () => {
    expect(rule.check(makePageData({ h1Tags: [] })).status).toBe(CheckStatus.FAIL);
  });
  it('FAIL multiple H1', () => {
    expect(rule.check(makePageData({ h1Tags: ['A', 'B'] })).status).toBe(CheckStatus.FAIL);
  });
});

describe('HeadingHierarchyRule', () => {
  const rule = new HeadingHierarchyRule();
  it('PASS H1 then H2 then H3', () => {
    const res = rule.check(
      makePageData({ h1Tags: ['A'], h2Tags: ['B'], h3Tags: ['C'], h4Tags: [], h5Tags: [], h6Tags: [] }),
    );
    expect(res.status).toBe(CheckStatus.PASS);
  });
  it('WARN minor skip like H2 then H4', () => {
    const res = rule.check(
      makePageData({ h1Tags: ['A'], h2Tags: ['B'], h3Tags: [], h4Tags: ['C'], h5Tags: [], h6Tags: [] }),
    );
    expect(res.status).toBe(CheckStatus.WARN);
  });
  it('FAIL no headings at all', () => {
    const res = rule.check(
      makePageData({ h1Tags: [], h2Tags: [], h3Tags: [], h4Tags: [], h5Tags: [], h6Tags: [] }),
    );
    expect(res.status).toBe(CheckStatus.FAIL);
  });
});

import { describe, expect, it } from 'vitest';
import { CheckStatus, IssueCategory, LinkInfo } from '@repo/shared';
import { BrokenLinksRule } from '../../../src/analyzer/domain/rules/links/broken-links.rule';
import { makePageData } from '../../fixtures/page-data.fixture';

const link = (overrides: Partial<LinkInfo> = {}): LinkInfo => ({
  href: '/x',
  anchorText: 'x',
  isInternal: true,
  rel: null,
  statusCode: 200,
  ...overrides,
});

describe('BrokenLinksRule', () => {
  const rule = new BrokenLinksRule();

  it('has stable id and LINKS category', () => {
    expect(rule.id).toBe('broken_links');
    expect(rule.category).toBe(IssueCategory.LINKS);
  });

  it('PASS (skipped) when no statusCode was populated (link-checks disabled)', () => {
    const res = rule.check(
      makePageData({
        internalLinks: [link({ statusCode: 0 }), link({ statusCode: 0 })],
        externalLinks: [link({ isInternal: false, statusCode: 0 })],
      }),
    );
    expect(res.status).toBe(CheckStatus.PASS);
    expect(res.score).toBe(100);
    expect(res.metadata.applicable).toBe(false);
  });

  it('PASS with 100 when every checked link returns 2xx', () => {
    const res = rule.check(
      makePageData({
        internalLinks: [link({ statusCode: 200 }), link({ statusCode: 201 })],
        externalLinks: [link({ isInternal: false, statusCode: 204 })],
      }),
    );
    expect(res.status).toBe(CheckStatus.PASS);
    expect(res.score).toBe(100);
    expect(res.metadata.broken).toBe(0);
    expect(res.metadata.checked).toBe(3);
  });

  it('WARN when only external links are broken (UX concern, not crawl-budget)', () => {
    const res = rule.check(
      makePageData({
        internalLinks: [link({ statusCode: 200 })],
        externalLinks: [
          link({ isInternal: false, statusCode: 404 }),
          link({ isInternal: false, statusCode: 200 }),
        ],
      }),
    );
    expect(res.status).toBe(CheckStatus.WARN);
    expect(res.score).toBe(50);
    expect(res.metadata.brokenInternal).toBe(0);
    expect(res.metadata.brokenExternal).toBe(1);
  });

  it('FAIL when any internal link is broken (crawl budget / UX both damaged)', () => {
    const res = rule.check(
      makePageData({
        internalLinks: [
          link({ statusCode: 200 }),
          link({ statusCode: 500, href: '/dead' }),
        ],
        externalLinks: [link({ isInternal: false, statusCode: 200 })],
      }),
    );
    expect(res.status).toBe(CheckStatus.FAIL);
    expect(res.score).toBe(0);
    expect(res.metadata.brokenInternal).toBe(1);
    expect(res.metadata.brokenExternal).toBe(0);
  });

  it('treats 5xx the same severity bucket as 4xx', () => {
    const res = rule.check(
      makePageData({
        internalLinks: [link({ statusCode: 503, href: '/oops' })],
        externalLinks: [],
      }),
    );
    expect(res.status).toBe(CheckStatus.FAIL);
  });

  it('reports the worst-offender href list in metadata', () => {
    const res = rule.check(
      makePageData({
        internalLinks: [
          link({ statusCode: 200 }),
          link({ statusCode: 404, href: '/dead1' }),
          link({ statusCode: 500, href: '/dead2' }),
        ],
        externalLinks: [link({ isInternal: false, statusCode: 404, href: 'https://x/gone' })],
      }),
    );
    const broken = res.metadata.brokenHrefs as string[];
    expect(broken).toEqual(expect.arrayContaining(['/dead1', '/dead2', 'https://x/gone']));
  });

  it('PASS when no links exist on the page', () => {
    const res = rule.check(makePageData({ internalLinks: [], externalLinks: [] }));
    expect(res.status).toBe(CheckStatus.PASS);
    expect(res.metadata.checked).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { CheckStatus, LinkInfo } from '@repo/shared';
import { InternalLinksRule } from '../../../src/analyzer/rules/links/internal-links.rule';
import { ExternalLinksRule } from '../../../src/analyzer/rules/links/external-links.rule';
import { makePageData } from '../../../src/analyzer/test-fixtures/page-data.fixture';

const link = (overrides: Partial<LinkInfo> = {}): LinkInfo => ({
  href: '/x', anchorText: 'x', isInternal: true, rel: null, statusCode: 200, ...overrides,
});

describe('InternalLinksRule', () => {
  const rule = new InternalLinksRule();
  it('PASS with >=3', () => {
    expect(rule.check(makePageData({ internalLinks: [link(), link(), link()] })).status).toBe(CheckStatus.PASS);
  });
  it('WARN with 1-2', () => {
    expect(rule.check(makePageData({ internalLinks: [link()] })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL with 0', () => {
    expect(rule.check(makePageData({ internalLinks: [] })).status).toBe(CheckStatus.FAIL);
  });
});

describe('ExternalLinksRule', () => {
  const rule = new ExternalLinksRule();
  it('PASS when no external links', () => {
    expect(rule.check(makePageData({ externalLinks: [] })).status).toBe(CheckStatus.PASS);
  });
  it('PASS when all externals have rel noopener', () => {
    const externals = [link({ isInternal: false, rel: 'noopener noreferrer', statusCode: 200 })];
    expect(rule.check(makePageData({ externalLinks: externals })).status).toBe(CheckStatus.PASS);
  });
  it('WARN when some are missing rel', () => {
    const externals = [
      link({ isInternal: false, rel: 'noopener', statusCode: 200 }),
      link({ isInternal: false, rel: null, statusCode: 200 }),
    ];
    expect(rule.check(makePageData({ externalLinks: externals })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when any external link is broken (4xx/5xx)', () => {
    const externals = [link({ isInternal: false, rel: 'noopener', statusCode: 404 })];
    expect(rule.check(makePageData({ externalLinks: externals })).status).toBe(CheckStatus.FAIL);
  });
});

import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { CitationOutboundRule } from '../../../../src/analyzer/domain/rules/geo/citation-outbound.rule';
import { PageData } from '../../../../src/analyzer/domain/page-data.interface';

const base: PageData = { url: 'https://example.com', externalLinks: [] } as any;

describe('CitationOutboundRule', () => {
  const rule = new CitationOutboundRule();

  it('fails when 0 authoritative external links', () => {
    expect(rule.check(base).status).toBe(CheckStatus.FAIL);
  });

  it('warns when 1-2 authoritative links', () => {
    const pd = { ...base, externalLinks: [{ href: 'https://wikipedia.org/x' }, { href: 'https://example.org/y' }] };
    expect(rule.check(pd).status).toBe(CheckStatus.WARN);
  });

  it('passes when >=3 authoritative links', () => {
    const pd = { ...base, externalLinks: [
      { href: 'https://wikipedia.org/x' },
      { href: 'https://nih.gov/y' },
      { href: 'https://reuters.com/z' },
    ] };
    expect(rule.check(pd).status).toBe(CheckStatus.PASS);
  });

  it('recognizes .edu and .gov TLDs', () => {
    const pd = { ...base, externalLinks: [
      { href: 'https://mit.edu/x' },
      { href: 'https://nasa.gov/y' },
      { href: 'https://example.com/z' },
    ] };
    expect(rule.check(pd).status).toBe(CheckStatus.WARN);
  });
});

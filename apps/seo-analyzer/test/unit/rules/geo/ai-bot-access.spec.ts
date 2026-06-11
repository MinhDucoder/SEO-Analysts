import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { AiBotAccessRule } from '../../../../src/analyzer/domain/rules/geo/ai-bot-access.rule';
import { PageData } from '../../../../src/analyzer/domain/page-data.interface';

const base: PageData = { url: 'https://example.com', textContent: '', images: [], h1Tags: [], h2Tags: [], h3Tags: [], h4Tags: [], h5Tags: [], h6Tags: [], internalLinks: [], externalLinks: [] } as any;

describe('AiBotAccessRule', () => {
  const rule = new AiBotAccessRule();

  it('passes when no aiBotAccess data (default-allow per RFC 9309)', () => {
    expect(rule.check(base).status).toBe(CheckStatus.PASS);
  });

  it('fails when GPTBot has Disallow: /', () => {
    const pd = { ...base, aiBotAccess: { robotsTxtUrl: 'x', robotsTxtStatus: 200, rules: [{ userAgent: 'GPTBot', disallow: ['/'], allow: [] }] } };
    expect(rule.check(pd).status).toBe(CheckStatus.FAIL);
  });

  it('warns when ClaudeBot disallows /blog only', () => {
    const pd = { ...base, aiBotAccess: { robotsTxtUrl: 'x', robotsTxtStatus: 200, rules: [{ userAgent: 'ClaudeBot', disallow: ['/blog'], allow: [] }] } };
    expect(rule.check(pd).status).toBe(CheckStatus.WARN);
  });

  it('passes when all bots allowed', () => {
    const pd = { ...base, aiBotAccess: { robotsTxtUrl: 'x', robotsTxtStatus: 200, rules: [{ userAgent: 'GPTBot', disallow: [], allow: ['/'] }] } };
    expect(rule.check(pd).status).toBe(CheckStatus.PASS);
  });

  it('exposes blocked bots in metadata', () => {
    const pd = { ...base, aiBotAccess: { robotsTxtUrl: 'x', robotsTxtStatus: 200, rules: [{ userAgent: 'GPTBot', disallow: ['/'], allow: [] }, { userAgent: 'ClaudeBot', disallow: ['/'], allow: [] }] } };
    expect(rule.check(pd).metadata).toMatchObject({ blockedBots: ['GPTBot', 'ClaudeBot'] });
  });
});

import { describe, expect, it } from 'vitest';
import { parseRobotsForAiBots, AI_BOT_USER_AGENTS } from '../../src/crawler/infra/fetchers/robots-multi-bot-parser';

describe('parseRobotsForAiBots', () => {
  it('returns no rules when input is empty', () => {
    expect(parseRobotsForAiBots('')).toEqual([]);
  });

  it('detects Disallow: / for GPTBot', () => {
    const input = `User-agent: GPTBot\nDisallow: /\n`;
    const result = parseRobotsForAiBots(input);
    const gpt = result.find((r) => r.userAgent === 'GPTBot');
    expect(gpt).toBeDefined();
    expect(gpt!.disallow).toEqual(['/']);
  });

  it('returns one rule per AI bot user agent (5 total)', () => {
    const input = AI_BOT_USER_AGENTS.map((ua) => `User-agent: ${ua}\nAllow: /\n`).join('\n');
    expect(parseRobotsForAiBots(input)).toHaveLength(5);
  });

  it('handles multiple Disallow + Allow per user-agent', () => {
    const input = `User-agent: ClaudeBot\nDisallow: /private\nDisallow: /tmp\nAllow: /private/public-doc\n`;
    const rule = parseRobotsForAiBots(input).find((r) => r.userAgent === 'ClaudeBot')!;
    expect(rule.disallow).toEqual(['/private', '/tmp']);
    expect(rule.allow).toEqual(['/private/public-doc']);
  });

  it('treats user-agent matching case-insensitively', () => {
    const input = `User-agent: gptbot\nDisallow: /\n`;
    const gpt = parseRobotsForAiBots(input).find((r) => r.userAgent === 'GPTBot');
    expect(gpt?.disallow).toEqual(['/']);
  });

  it('ignores unrelated user-agents', () => {
    const input = `User-agent: Googlebot\nDisallow: /admin\n`;
    expect(parseRobotsForAiBots(input)).toEqual([]);
  });
});

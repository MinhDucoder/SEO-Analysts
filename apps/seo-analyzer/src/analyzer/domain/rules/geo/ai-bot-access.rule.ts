import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

const HIGH_VALUE_PATHS = ['/blog', '/docs', '/articles', '/help'];

export class AiBotAccessRule implements ISeoRule {
  readonly id = 'geo_ai_bot_access';
  readonly category = IssueCategory.GEO;

  check(pageData: PageData): RuleCheckOutput {
    const access = pageData.aiBotAccess;
    if (!access || access.rules.length === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'No AI bot restrictions detected (default allow per RFC 9309)',
        suggestion: null,
        metadata: { rules: [] },
      };
    }
    const blocked = access.rules.filter((r) => r.disallow.includes('/'));
    if (blocked.length > 0) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: `${blocked.length} AI bot(s) blocked: ${blocked.map((b) => b.userAgent).join(', ')}`,
        suggestion: 'Remove "Disallow: /" for AI bots in robots.txt to be eligible for AI search citation.',
        metadata: { blockedBots: blocked.map((b) => b.userAgent), rules: access.rules },
      };
    }
    const warned = access.rules.filter((r) => r.disallow.some((p) => HIGH_VALUE_PATHS.some((hv) => p.startsWith(hv))));
    if (warned.length > 0) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `${warned.length} AI bot(s) blocked from high-value paths`,
        suggestion: `Consider allowing /blog and /docs for ${warned.map((w) => w.userAgent).join(', ')}.`,
        metadata: { warnedBots: warned.map((w) => w.userAgent), rules: access.rules },
      };
    }
    return {
      status: CheckStatus.PASS,
      score: 100,
      message: 'All AI bots allowed access',
      suggestion: null,
      metadata: { rules: access.rules },
    };
  }
}

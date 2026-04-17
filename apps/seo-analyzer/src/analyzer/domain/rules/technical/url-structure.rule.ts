/**
 * @file Rule: URL clean, short, uses hyphens.
 */
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

export class UrlStructureRule implements ISeoRule {
  readonly id = 'url_structure';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    let parsed: URL;
    try {
      parsed = new URL(pageData.url);
    } catch {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'URL is malformed',
        suggestion: null,
        metadata: {},
      };
    }

    const path = parsed.pathname;
    const issues: string[] = [];
    if (path.length > 100) issues.push('path_too_long');
    if (parsed.search.length > 0) issues.push('query_params');
    if (/[A-Z]/.test(path)) issues.push('uppercase');
    if (/_/.test(path)) issues.push('underscores');

    if (issues.length === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'URL is short, clean and lowercase',
        suggestion: null,
        metadata: { path, issues },
      };
    }
    if (issues.length <= 1) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `URL has minor issues: ${issues.join(', ')}`,
        suggestion: 'Shorten URL, use hyphens and lowercase, avoid query strings where possible.',
        metadata: { path, issues },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `URL has multiple structural issues: ${issues.join(', ')}`,
      suggestion: 'Rewrite the URL to be short, lowercase, hyphen-separated and free of query strings.',
      metadata: { path, issues },
    };
  }
}

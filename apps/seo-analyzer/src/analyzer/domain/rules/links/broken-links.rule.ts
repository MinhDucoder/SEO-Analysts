/**
 * @file F4 broken-link audit rule. Consumes LinkInfo.statusCode which
 * the crawler's LinkChecker populates when `includeLinkChecks=true`.
 *
 * Severity model:
 *   - PASS — no links, no checks run, or all checked returned 2xx
 *   - WARN — only external links broken (UX concern)
 *   - FAIL — ANY internal link broken (damages crawl budget + UX)
 *
 * When statusCode is 0 for every link we treat the check as "not
 * applicable" (link-checks were disabled upstream) and PASS silently.
 */
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../seo-rule.interface';
import { PageData } from '../../page-data.interface';

const MAX_BROKEN_HREFS = 20;

export class BrokenLinksRule implements ISeoRule {
  readonly id = 'broken_links';
  readonly category = IssueCategory.LINKS;

  check(pageData: PageData): RuleCheckOutput {
    const all = [...pageData.internalLinks, ...pageData.externalLinks];

    if (all.length === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'No links to check',
        suggestion: null,
        metadata: { checked: 0, broken: 0, applicable: true },
      };
    }

    const checked = all.filter((l) => l.statusCode > 0);
    if (checked.length === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'Broken-link checks were not enabled for this audit',
        suggestion: 'Re-run with includeLinkChecks=true to audit HTTP status of every link',
        metadata: { checked: 0, broken: 0, applicable: false },
      };
    }

    const broken = checked.filter((l) => l.statusCode >= 400);
    const brokenInternal = broken.filter((l) => l.isInternal);
    const brokenExternal = broken.filter((l) => !l.isInternal);
    const brokenHrefs = broken.slice(0, MAX_BROKEN_HREFS).map((l) => l.href);

    if (broken.length === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `All ${checked.length} links return a 2xx/3xx status`,
        suggestion: null,
        metadata: {
          checked: checked.length,
          broken: 0,
          brokenInternal: 0,
          brokenExternal: 0,
          applicable: true,
        },
      };
    }

    if (brokenInternal.length > 0) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: `${brokenInternal.length} internal + ${brokenExternal.length} external link(s) broken`,
        suggestion: 'Fix or remove broken internal links — they waste crawl budget and hurt UX.',
        metadata: {
          checked: checked.length,
          broken: broken.length,
          brokenInternal: brokenInternal.length,
          brokenExternal: brokenExternal.length,
          brokenHrefs,
          applicable: true,
        },
      };
    }

    return {
      status: CheckStatus.WARN,
      score: 50,
      message: `${brokenExternal.length} external link(s) broken`,
      suggestion: 'Replace or remove broken external links for better UX.',
      metadata: {
        checked: checked.length,
        broken: broken.length,
        brokenInternal: 0,
        brokenExternal: brokenExternal.length,
        brokenHrefs,
        applicable: true,
      },
    };
  }
}

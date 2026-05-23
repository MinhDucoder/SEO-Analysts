import { seededRandom } from './helpers';

export type RuleCategory =
  | 'meta'
  | 'headings'
  | 'images'
  | 'links'
  | 'performance'
  | 'technical'
  | 'content';
export type CheckStatus = 'pass' | 'warn' | 'fail';

/**
 * Catalog of the 22 SEO rules seeded by apps/seo-analyzer/prisma/seed.ts.
 * `ruleName` here matches the `name` column of the SeoRule row, and is
 * what we store in RuleResult.ruleId (denormalized VarChar, not FK).
 */
export const RULE_CATALOG: Array<{
  name: string;
  displayName: string;
  category: RuleCategory;
  weight: number;
  passMessage: string;
  warnMessage: string;
  failMessage: string;
  suggestion: string;
}> = [
  { name: 'title_tag',          displayName: 'Title Tag',          category: 'meta',        weight: 8, passMessage: 'Title hợp lý, đủ độ dài',                  warnMessage: 'Title hơi dài (>60 ký tự)',                     failMessage: 'Thiếu title tag',                              suggestion: 'Title nên dài 50-60 ký tự, chứa từ khoá chính' },
  { name: 'meta_description',   displayName: 'Meta Description',   category: 'meta',        weight: 7, passMessage: 'Meta description đầy đủ (120-160 ký tự)', warnMessage: 'Meta description ngắn (<120 ký tự)',            failMessage: 'Thiếu meta description',                       suggestion: 'Viết meta description 120-160 ký tự, kêu gọi click' },
  { name: 'h1_tag',             displayName: 'H1 Tag',             category: 'headings',    weight: 8, passMessage: 'Đúng 1 H1, chứa từ khoá',                  warnMessage: 'Có >1 H1 trên trang',                           failMessage: 'Thiếu H1',                                     suggestion: 'Mỗi trang nên có duy nhất 1 H1 chứa từ khoá chính' },
  { name: 'heading_hierarchy',  displayName: 'Heading Hierarchy',  category: 'headings',    weight: 6, passMessage: 'Heading đúng thứ tự H1→H2→H3',             warnMessage: 'Vài chỗ bỏ cấp heading',                        failMessage: 'Heading lộn xộn (H3 trước H2)',                suggestion: 'Đảm bảo H1→H2→H3 đúng thứ tự, không nhảy cấp' },
  { name: 'image_alt',          displayName: 'Image Alt Text',     category: 'images',      weight: 7, passMessage: 'Mọi ảnh có alt',                            warnMessage: '1-2 ảnh thiếu alt',                             failMessage: 'Nhiều ảnh thiếu alt text',                     suggestion: 'Thêm alt mô tả ngắn gọn cho mọi <img>' },
  { name: 'canonical_url',      displayName: 'Canonical URL',      category: 'technical',   weight: 5, passMessage: 'Đã khai báo rel=canonical',                warnMessage: 'Canonical trỏ về URL khác domain',              failMessage: 'Thiếu canonical',                              suggestion: 'Thêm <link rel="canonical" href="..."> trong <head>' },
  { name: 'robots_meta',        displayName: 'Robots Meta',        category: 'technical',   weight: 6, passMessage: 'Trang cho phép index',                     warnMessage: 'Robots khai báo noarchive',                     failMessage: 'Trang đang noindex',                           suggestion: 'Bỏ noindex để Google index trang' },
  { name: 'viewport_meta',      displayName: 'Viewport Meta',      category: 'technical',   weight: 10, passMessage: 'Có viewport, mobile-friendly',             warnMessage: 'Viewport thiếu user-scalable',                  failMessage: 'Thiếu meta viewport',                          suggestion: 'Thêm <meta name="viewport" content="width=device-width, initial-scale=1">' },
  { name: 'https_check',        displayName: 'HTTPS',              category: 'technical',   weight: 10, passMessage: 'Trang phục vụ qua HTTPS',                  warnMessage: 'Có mixed content HTTP/HTTPS',                   failMessage: 'Trang dùng HTTP, không có SSL',                suggestion: 'Cài SSL cert và redirect HTTP → HTTPS' },
  { name: 'open_graph',         displayName: 'Open Graph',         category: 'meta',        weight: 5, passMessage: 'Đủ og:title, og:description, og:image',   warnMessage: 'Thiếu 1-2 og:* tag',                            failMessage: 'Không có Open Graph',                          suggestion: 'Thêm og:title, og:description, og:image, og:url' },
  { name: 'twitter_card',       displayName: 'Twitter Card',       category: 'meta',        weight: 3, passMessage: 'Có twitter:card meta',                     warnMessage: 'Twitter card type chưa tối ưu',                 failMessage: 'Thiếu twitter:card',                           suggestion: 'Thêm <meta name="twitter:card" content="summary_large_image">' },
  { name: 'schema_org',         displayName: 'Schema.org',         category: 'technical',   weight: 6, passMessage: 'Có JSON-LD structured data',               warnMessage: 'JSON-LD thiếu trường recommended',              failMessage: 'Không có structured data',                     suggestion: 'Thêm JSON-LD schema.org cho rich results' },
  { name: 'internal_links',     displayName: 'Internal Links',     category: 'links',       weight: 5, passMessage: 'Internal links phong phú (>=10)',          warnMessage: 'Ít internal link (<5)',                         failMessage: 'Không có internal link',                       suggestion: 'Thêm ít nhất 3-5 internal link trỏ đến trang liên quan' },
  { name: 'external_links',     displayName: 'External Links',     category: 'links',       weight: 3, passMessage: 'External link dùng rel hợp lý',            warnMessage: 'Vài external link thiếu rel="nofollow"',        failMessage: 'External link không có rel',                   suggestion: 'External link nên có rel="noopener" hoặc "nofollow"' },
  { name: 'broken_links',       displayName: 'Broken Links',       category: 'links',       weight: 7, passMessage: 'Không có broken link',                      warnMessage: '1-2 external link 4xx',                         failMessage: 'Internal link broken (404)',                   suggestion: 'Fix hoặc xoá các link trả về 404/500' },
  { name: 'image_optimization', displayName: 'Image Optimization', category: 'images',      weight: 5, passMessage: 'Ảnh đã optimize (WebP, <200KB)',           warnMessage: 'Vài ảnh chưa dùng WebP',                        failMessage: 'Nhiều ảnh >500KB, chưa optimize',              suggestion: 'Convert ảnh sang WebP/AVIF, resize phù hợp' },
  { name: 'page_size',          displayName: 'Page Size',          category: 'performance', weight: 4, passMessage: 'Page size <2MB',                            warnMessage: 'Page size 2-3MB',                                failMessage: 'Page size >5MB, quá nặng',                      suggestion: 'Giảm CSS/JS, lazy-load ảnh, dùng CDN' },
  { name: 'http_status',        displayName: 'HTTP Status',        category: 'technical',   weight: 8, passMessage: 'Trang trả về 200',                          warnMessage: '301/302 redirect chain dài',                    failMessage: 'Trang trả về 4xx/5xx',                         suggestion: 'Đảm bảo trang phản hồi 200, redirect 1 hop' },
  { name: 'url_structure',      displayName: 'URL Structure',      category: 'technical',   weight: 4, passMessage: 'URL ngắn gọn, có từ khoá',                  warnMessage: 'URL hơi dài (>80 ký tự)',                       failMessage: 'URL chứa query string phức tạp',              suggestion: 'URL ngắn, kebab-case, chứa từ khoá chính' },
  { name: 'language_tag',       displayName: 'Language Tag',       category: 'technical',   weight: 3, passMessage: 'html lang được khai báo',                   warnMessage: 'Lang khác content thực tế',                     failMessage: 'Thiếu thuộc tính lang',                        suggestion: 'Thêm <html lang="vi"> hoặc tương ứng' },
  { name: 'favicon',            displayName: 'Favicon',            category: 'technical',   weight: 2, passMessage: 'Có favicon',                                warnMessage: 'Favicon kích thước nhỏ',                        failMessage: 'Thiếu favicon',                                suggestion: 'Thêm <link rel="icon" href="/favicon.ico">' },
  { name: 'readability',        displayName: 'Readability',        category: 'content',     weight: 4, passMessage: 'Flesch Reading Ease 60-70',                 warnMessage: 'Readability hơi khó (50-60)',                   failMessage: 'Văn bản khó đọc (<50)',                        suggestion: 'Câu ngắn, từ đơn giản, target Flesch 60-70' },
];

export type DemoRuleResultRow = {
  auditId: string;
  ruleId: string;       // = SeoRule.name (denormalized VarChar)
  ruleName: string;
  category: RuleCategory;
  status: CheckStatus;
  score: number;        // 0-100 per-rule
  weight: number;
  message: string;
  suggestion: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Distribution targets per audit score tier. Numbers must sum to 22.
 * Order: pass / warn / fail.
 */
function distributionForScore(seoScore: number): { pass: number; warn: number; fail: number } {
  if (seoScore >= 90) return { pass: 19, warn: 2, fail: 1 };
  if (seoScore >= 70) return { pass: 14, warn: 5, fail: 3 };
  if (seoScore >= 50) return { pass: 9, warn: 7, fail: 6 };
  return { pass: 5, warn: 5, fail: 12 };
}

export function generateRuleResultsForAudit(auditId: string, seoScore: number): DemoRuleResultRow[] {
  const dist = distributionForScore(seoScore);
  const rng = seededRandom(auditId);

  // Shuffle RULE_CATALOG deterministically so different audits get
  // different rules failing — still reproducible per auditId.
  const shuffled = [...RULE_CATALOG]
    .map((rule) => ({ rule, sort: rng() }))
    .sort((a, b) => a.sort - b.sort)
    .map((x) => x.rule);

  // Critical rules (https, viewport, h1, http_status) should rarely fail
  // when seoScore is high — sort them to the front of "pass" pool.
  const criticalNames = new Set(['https_check', 'viewport_meta', 'h1_tag', 'http_status']);
  shuffled.sort((a, b) => {
    const aCrit = criticalNames.has(a.name) ? 1 : 0;
    const bCrit = criticalNames.has(b.name) ? 1 : 0;
    return bCrit - aCrit;
  });

  const results: DemoRuleResultRow[] = [];

  shuffled.forEach((rule, idx) => {
    let status: CheckStatus;
    let score: number;
    let message: string;
    let suggestion: string | null;

    if (idx < dist.pass) {
      status = 'pass';
      score = 95 + Math.floor(rng() * 5);
      message = rule.passMessage;
      suggestion = null;
    } else if (idx < dist.pass + dist.warn) {
      status = 'warn';
      score = 55 + Math.floor(rng() * 20);
      message = rule.warnMessage;
      suggestion = rule.suggestion;
    } else {
      status = 'fail';
      score = Math.floor(rng() * 25);
      message = rule.failMessage;
      suggestion = rule.suggestion;
    }

    results.push({
      auditId,
      ruleId: rule.name,
      ruleName: rule.name,
      category: rule.category,
      status,
      score,
      weight: rule.weight,
      message,
      suggestion,
      metadata: { displayName: rule.displayName },
    });
  });

  return results;
}

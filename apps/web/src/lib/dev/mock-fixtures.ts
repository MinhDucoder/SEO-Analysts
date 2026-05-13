import { AuditStatus } from "@repo/shared";
import type {
  AdminPaginated,
  AdminStats,
  AdminUser,
  AuditDetailResponse,
  AuditListItem,
  AuthenticatedUser,
  CompareResult,
  Paginated,
  ProtoCheckStatus,
  ProtoIssueCategory,
  ReportDetail,
  SeoRule,
} from "@/lib/api/types";
import type { ScheduledAudit } from "@/lib/api/scheduled";

/**
 * Fixture data for dev-mode MSW handlers. Loaded only when
 * NEXT_PUBLIC_DEV_BYPASS_AUTH=1 — never bundled in production paths.
 */

export const mockMeUser: AuthenticatedUser = {
  id: "dev-bypass-user",
  email: "dev-bypass@local",
  fullName: "Dev Bypass Admin",
  role: "admin",
  emailVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const auditSeed: Array<{
  id: string;
  url: string;
  domain: string;
  status: AuditStatus;
  seoScore: number | null;
  keyword: string | null;
  daysAgo: number;
  duration: number;
}> = [
  { id: "aud-01", url: "https://techblog.io/posts/nextjs-14-app-router", domain: "techblog.io", status: AuditStatus.COMPLETED, seoScore: 92, keyword: "Next.js 14", daysAgo: 0, duration: 1820 },
  { id: "aud-02", url: "https://shopdemo.vn/san-pham/macbook-air-m4", domain: "shopdemo.vn", status: AuditStatus.COMPLETED, seoScore: 78, keyword: "macbook air m4", daysAgo: 1, duration: 2410 },
  { id: "aud-03", url: "https://agency-pro.com/services/seo-audit", domain: "agency-pro.com", status: AuditStatus.COMPLETED, seoScore: 85, keyword: "seo audit service", daysAgo: 1, duration: 2150 },
  { id: "aud-04", url: "https://news-daily.com/tech/ai-summit-2026", domain: "news-daily.com", status: AuditStatus.COMPLETED, seoScore: 67, keyword: null, daysAgo: 2, duration: 1980 },
  { id: "aud-05", url: "https://portfolio-2026.dev/projects/case-study", domain: "portfolio-2026.dev", status: AuditStatus.COMPLETED, seoScore: 88, keyword: "portfolio designer", daysAgo: 3, duration: 1730 },
  { id: "aud-06", url: "https://shopdemo.vn/blog/uu-dai-thang-5", domain: "shopdemo.vn", status: AuditStatus.COMPLETED, seoScore: 55, keyword: "khuyến mãi tháng 5", daysAgo: 3, duration: 3120 },
  { id: "aud-07", url: "https://techblog.io/tutorials/react-server-components", domain: "techblog.io", status: AuditStatus.COMPLETED, seoScore: 90, keyword: "react server components", daysAgo: 4, duration: 1640 },
  { id: "aud-08", url: "https://agency-pro.com/blog/core-web-vitals", domain: "agency-pro.com", status: AuditStatus.ANALYZING, seoScore: null, keyword: "core web vitals", daysAgo: 0, duration: 0 },
  { id: "aud-09", url: "https://startup-x.io/landing", domain: "startup-x.io", status: AuditStatus.COMPLETED, seoScore: 47, keyword: null, daysAgo: 5, duration: 2890 },
  { id: "aud-10", url: "https://learn-vietnam.org/khoa-hoc/lap-trinh-web", domain: "learn-vietnam.org", status: AuditStatus.COMPLETED, seoScore: 81, keyword: "học lập trình web", daysAgo: 6, duration: 2050 },
  { id: "aud-11", url: "https://news-daily.com/business/q1-report", domain: "news-daily.com", status: AuditStatus.FAILED, seoScore: null, keyword: null, daysAgo: 7, duration: 0 },
  { id: "aud-12", url: "https://portfolio-2026.dev/about", domain: "portfolio-2026.dev", status: AuditStatus.CRAWLING, seoScore: null, keyword: null, daysAgo: 0, duration: 0 },
];

const NOW = new Date("2026-05-13T10:00:00.000Z");
function isoDaysAgo(days: number, hourOffset = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hourOffset);
  return d.toISOString();
}

export const mockAudits: AuditListItem[] = auditSeed.map((a) => ({
  id: a.id,
  url: a.url,
  domain: a.domain,
  status: a.status,
  seoScore: a.seoScore,
  targetKeyword: a.keyword,
  crawlerType: a.daysAgo % 3 === 0 ? "playwright" : "cheerio",
  crawlDurationMs: a.duration || null,
  createdAt: isoDaysAgo(a.daysAgo, 2),
  completedAt:
    a.status === AuditStatus.COMPLETED || a.status === AuditStatus.FAILED
      ? isoDaysAgo(a.daysAgo, 1)
      : null,
}));

export const mockAuditsPaginated: Paginated<AuditListItem> = {
  data: mockAudits,
  total: mockAudits.length,
  page: 1,
  limit: 30,
};

const ruleSeed: Array<{
  id: string;
  name: string;
  display: string;
  desc: string;
  cat: ProtoIssueCategory;
  weight: number;
  enabled: boolean;
}> = [
  { id: "r-01", name: "title-tag", display: "Thẻ Title", desc: "Kiểm tra độ dài và sự tồn tại của thẻ <title>", cat: "ISSUE_CATEGORY_META", weight: 8, enabled: true },
  { id: "r-02", name: "meta-description", display: "Meta Description", desc: "Meta description từ 50-160 ký tự", cat: "ISSUE_CATEGORY_META", weight: 7, enabled: true },
  { id: "r-03", name: "open-graph", display: "Open Graph Tags", desc: "Thẻ og:title, og:description, og:image", cat: "ISSUE_CATEGORY_META", weight: 4, enabled: true },
  { id: "r-04", name: "twitter-card", display: "Twitter Card", desc: "Thẻ twitter:card meta", cat: "ISSUE_CATEGORY_META", weight: 3, enabled: true },
  { id: "r-05", name: "h1-tag", display: "Thẻ H1", desc: "Mỗi trang có chính xác một H1", cat: "ISSUE_CATEGORY_HEADINGS", weight: 8, enabled: true },
  { id: "r-06", name: "heading-hierarchy", display: "Cấu trúc Heading", desc: "H1 → H2 → H3 đúng thứ tự", cat: "ISSUE_CATEGORY_HEADINGS", weight: 5, enabled: true },
  { id: "r-07", name: "image-alt", display: "Alt text cho ảnh", desc: "Mọi <img> đều có alt", cat: "ISSUE_CATEGORY_IMAGES", weight: 6, enabled: true },
  { id: "r-08", name: "image-optimization", display: "Tối ưu ảnh", desc: "Ảnh ≤ 200KB và dùng định dạng modern", cat: "ISSUE_CATEGORY_IMAGES", weight: 5, enabled: true },
  { id: "r-09", name: "internal-links", display: "Internal Links", desc: "Có ≥ 3 internal link", cat: "ISSUE_CATEGORY_LINKS", weight: 4, enabled: true },
  { id: "r-10", name: "external-links", display: "External Links", desc: "External link có rel=nofollow nếu cần", cat: "ISSUE_CATEGORY_LINKS", weight: 3, enabled: true },
  { id: "r-11", name: "broken-links", display: "Broken Links", desc: "Không có link 4xx/5xx", cat: "ISSUE_CATEGORY_LINKS", weight: 7, enabled: true },
  { id: "r-12", name: "readability", display: "Khả năng đọc", desc: "Flesch-Kincaid grade ≤ 10", cat: "ISSUE_CATEGORY_TECHNICAL", weight: 4, enabled: true },
  { id: "r-13", name: "page-size", display: "Kích thước trang", desc: "Tổng HTML ≤ 500KB", cat: "ISSUE_CATEGORY_PERFORMANCE", weight: 5, enabled: true },
  { id: "r-14", name: "language-tag", display: "Thẻ Language", desc: "<html lang=...> hợp lệ", cat: "ISSUE_CATEGORY_TECHNICAL", weight: 3, enabled: true },
  { id: "r-15", name: "canonical-url", display: "Canonical URL", desc: "Có thẻ <link rel=canonical>", cat: "ISSUE_CATEGORY_TECHNICAL", weight: 6, enabled: true },
  { id: "r-16", name: "favicon", display: "Favicon", desc: "Site có favicon", cat: "ISSUE_CATEGORY_TECHNICAL", weight: 2, enabled: true },
  { id: "r-17", name: "schema-org", display: "Structured Data", desc: "JSON-LD schema.org có hiệu lực", cat: "ISSUE_CATEGORY_TECHNICAL", weight: 5, enabled: true },
  { id: "r-18", name: "http-status", display: "HTTP Status", desc: "Trang trả 200 OK", cat: "ISSUE_CATEGORY_TECHNICAL", weight: 8, enabled: true },
  { id: "r-19", name: "https-check", display: "HTTPS", desc: "Site phục vụ qua HTTPS", cat: "ISSUE_CATEGORY_TECHNICAL", weight: 7, enabled: true },
  { id: "r-20", name: "viewport-meta", display: "Viewport Meta", desc: "<meta name=viewport> mobile-friendly", cat: "ISSUE_CATEGORY_TECHNICAL", weight: 5, enabled: true },
];

export const mockRules: SeoRule[] = ruleSeed.map((r) => ({
  id: r.id,
  name: r.name,
  displayName: r.display,
  description: r.desc,
  category: r.cat,
  weight: r.weight,
  isEnabled: r.enabled,
}));

const ruleResultStatuses: ProtoCheckStatus[] = [
  "CHECK_STATUS_PASS", "CHECK_STATUS_PASS", "CHECK_STATUS_PASS",
  "CHECK_STATUS_PASS", "CHECK_STATUS_PASS", "CHECK_STATUS_WARN",
  "CHECK_STATUS_PASS", "CHECK_STATUS_WARN", "CHECK_STATUS_PASS",
  "CHECK_STATUS_PASS", "CHECK_STATUS_FAIL", "CHECK_STATUS_WARN",
  "CHECK_STATUS_PASS", "CHECK_STATUS_PASS", "CHECK_STATUS_PASS",
  "CHECK_STATUS_PASS", "CHECK_STATUS_WARN", "CHECK_STATUS_PASS",
  "CHECK_STATUS_PASS", "CHECK_STATUS_PASS",
];

const ruleMessages: Record<string, { ok: string; warn: string; fail: string; suggest: string }> = {
  "title-tag": { ok: "Title dài 58 ký tự, hợp lệ", warn: "Title hơi ngắn (38 ký tự)", fail: "Thiếu thẻ title", suggest: "Giữ title 50-60 ký tự, có từ khoá chính ở đầu" },
  "meta-description": { ok: "Description dài 142 ký tự", warn: "Description chỉ 48 ký tự, hơi ngắn", fail: "Thiếu meta description", suggest: "Viết description 120-155 ký tự, có call-to-action" },
  "open-graph": { ok: "Đủ og:title/description/image", warn: "Thiếu og:image", fail: "Không có Open Graph tag", suggest: "Thêm og:image kích thước 1200x630px" },
  "twitter-card": { ok: "Có twitter:card summary_large_image", warn: "Card type không tối ưu", fail: "Thiếu twitter:card", suggest: "Dùng summary_large_image để preview to hơn" },
  "h1-tag": { ok: "Chính xác 1 thẻ H1", warn: "H1 trùng với title", fail: "Có 2 thẻ H1", suggest: "Đảm bảo có chính xác 1 H1 mỗi trang" },
  "heading-hierarchy": { ok: "Heading đúng thứ tự", warn: "Bỏ qua H3 (H2 → H4)", fail: "H1 nằm sau H2", suggest: "Không nhảy bậc heading; theo thứ tự H1→H2→H3" },
  "image-alt": { ok: "12/12 ảnh có alt", warn: "8/12 ảnh có alt (66%)", fail: "0/15 ảnh có alt", suggest: "Thêm alt mô tả ngắn cho từng ảnh nội dung" },
  "image-optimization": { ok: "Trung bình 78KB/ảnh, dùng WebP", warn: "3 ảnh > 200KB", fail: "Ảnh > 1MB, định dạng PNG", suggest: "Convert sang WebP/AVIF và nén dưới 200KB" },
  "internal-links": { ok: "18 internal links", warn: "Chỉ 2 internal links", fail: "Không có internal link", suggest: "Thêm ≥ 3 link tới trang liên quan" },
  "external-links": { ok: "5 external link, đều có rel=noopener", warn: "1 external link thiếu rel=noopener", fail: "External link không an toàn", suggest: "Thêm rel='noopener noreferrer' cho link mở tab mới" },
  "broken-links": { ok: "Không có link gãy", warn: "2 link redirect 301", fail: "5 link trả 404", suggest: "Sửa link gãy hoặc remove khỏi navigation" },
  "readability": { ok: "Grade level 8", warn: "Grade level 12", fail: "Grade level 16+, quá khó", suggest: "Viết câu ngắn, dùng từ phổ thông để dễ đọc" },
  "page-size": { ok: "HTML 142KB", warn: "HTML 380KB", fail: "HTML 1.2MB", suggest: "Tách bớt JS inline, lazy-load image dưới fold" },
  "language-tag": { ok: "<html lang='vi'>", warn: "Thiếu region (vi vs vi-VN)", fail: "Thiếu lang attribute", suggest: "Khai báo <html lang='vi-VN'>" },
  "canonical-url": { ok: "Có canonical đúng", warn: "Canonical trỏ về URL khác locale", fail: "Thiếu canonical", suggest: "Thêm <link rel='canonical' href='...'> ở <head>" },
  "favicon": { ok: "Có favicon 32x32 + 180x180", warn: "Chỉ có favicon mặc định", fail: "Không tìm thấy favicon", suggest: "Cung cấp favicon.ico + apple-touch-icon.png" },
  "schema-org": { ok: "Có Article + BreadcrumbList JSON-LD", warn: "Schema thiếu trường bắt buộc", fail: "Không có structured data", suggest: "Thêm JSON-LD Article hoặc Product theo schema.org" },
  "http-status": { ok: "200 OK", warn: "301 redirect chain dài", fail: "404 / 500", suggest: "Đảm bảo trang trả 200 trực tiếp, không redirect" },
  "https-check": { ok: "Phục vụ qua HTTPS, cert hợp lệ", warn: "Mixed content HTTP", fail: "Site chỉ có HTTP", suggest: "Bật HTTPS, redirect HTTP→HTTPS, fix mixed content" },
  "viewport-meta": { ok: "Có viewport meta", warn: "Viewport thiếu initial-scale", fail: "Thiếu viewport meta", suggest: "<meta name='viewport' content='width=device-width, initial-scale=1'>" },
};

function buildRuleResults() {
  return ruleSeed.map((r, i) => {
    const status = ruleResultStatuses[i] ?? "CHECK_STATUS_PASS";
    const msg = ruleMessages[r.name] ?? { ok: "OK", warn: "Warn", fail: "Fail", suggest: "..." };
    const text =
      status === "CHECK_STATUS_PASS" ? msg.ok :
      status === "CHECK_STATUS_WARN" ? msg.warn : msg.fail;
    const score =
      status === "CHECK_STATUS_PASS" ? r.weight :
      status === "CHECK_STATUS_WARN" ? Math.floor(r.weight * 0.6) : 0;
    return {
      ruleId: r.id,
      ruleName: r.name,
      status,
      score,
      weight: r.weight,
      category: r.cat,
      message: text,
      suggestion: status === "CHECK_STATUS_PASS" ? undefined : msg.suggest,
      metadata: {},
    };
  });
}

const richReport: ReportDetail = {
  reportId: "rep-aud-01",
  auditId: "aud-01",
  url: "https://techblog.io/posts/nextjs-14-app-router",
  domain: "techblog.io",
  finalScore: 92,
  classification: "excellent",
  ruleResults: buildRuleResults(),
  categoryScores: [
    { category: "ISSUE_CATEGORY_META", score: 88, totalRules: 4, passed: 3, warned: 1, failed: 0 },
    { category: "ISSUE_CATEGORY_HEADINGS", score: 95, totalRules: 2, passed: 2, warned: 0, failed: 0 },
    { category: "ISSUE_CATEGORY_IMAGES", score: 72, totalRules: 2, passed: 1, warned: 1, failed: 0 },
    { category: "ISSUE_CATEGORY_LINKS", score: 65, totalRules: 3, passed: 2, warned: 0, failed: 1 },
    { category: "ISSUE_CATEGORY_PERFORMANCE", score: 90, totalRules: 1, passed: 1, warned: 0, failed: 0 },
    { category: "ISSUE_CATEGORY_TECHNICAL", score: 94, totalRules: 8, passed: 7, warned: 1, failed: 0 },
  ],
  keywords: [
    { keyword: "nextjs", frequency: 28, densityPercent: 2.4, inTitle: true, inH1: true, inFirstParagraph: true, inMetaDescription: true, rank: 1 },
    { keyword: "app router", frequency: 19, densityPercent: 1.6, inTitle: true, inH1: true, inFirstParagraph: true, inMetaDescription: true, rank: 2 },
    { keyword: "react", frequency: 17, densityPercent: 1.4, inTitle: false, inH1: false, inFirstParagraph: true, inMetaDescription: false, rank: 3 },
    { keyword: "server component", frequency: 12, densityPercent: 1.0, inTitle: false, inH1: false, inFirstParagraph: true, inMetaDescription: false, rank: 4 },
    { keyword: "routing", frequency: 11, densityPercent: 0.9, inTitle: false, inH1: false, inFirstParagraph: false, inMetaDescription: false, rank: 5 },
    { keyword: "metadata", frequency: 9, densityPercent: 0.8, inTitle: false, inH1: false, inFirstParagraph: false, inMetaDescription: true, rank: 6 },
    { keyword: "layout", frequency: 9, densityPercent: 0.8, inTitle: false, inH1: false, inFirstParagraph: false, inMetaDescription: false, rank: 7 },
    { keyword: "tutorial", frequency: 7, densityPercent: 0.6, inTitle: false, inH1: false, inFirstParagraph: false, inMetaDescription: false, rank: 8 },
    { keyword: "typescript", frequency: 6, densityPercent: 0.5, inTitle: false, inH1: false, inFirstParagraph: false, inMetaDescription: false, rank: 9 },
    { keyword: "vercel", frequency: 5, densityPercent: 0.4, inTitle: false, inH1: false, inFirstParagraph: false, inMetaDescription: false, rank: 10 },
  ],
  cwvMetrics: {
    lcpMs: 2380,
    inpMs: 165,
    cls: 0.06,
    performanceScore: 92,
    accessibilityScore: 96,
    bestPracticesScore: 95,
    seoScore: 98,
  },
  targetKeyword: {
    keyword: "Next.js 14",
    frequency: 18,
    densityPercent: 1.5,
    inTitle: true,
    inH1: true,
    inFirstParagraph: true,
    inMetaDescription: true,
    isStuffing: false,
    verdict: "Phủ tốt, mật độ hợp lý",
  },
  createdAt: isoDaysAgo(0, 1),
};

export function mockReportFor(auditId: string): ReportDetail {
  return { ...richReport, reportId: `rep-${auditId}`, auditId };
}

export function mockAuditDetail(id: string): AuditDetailResponse {
  const a = mockAudits.find((x) => x.id === id) ?? mockAudits[0]!;
  return {
    audit: { ...a, id, errorMessage: a.status === AuditStatus.FAILED ? "Crawler timeout sau 30s" : null },
    report: a.status === AuditStatus.COMPLETED ? mockReportFor(id) : null,
  };
}

export const mockScheduled: ScheduledAudit[] = [
  { id: "sch-01", userId: "dev-bypass-user", url: "https://techblog.io", cron: "0 9 * * *", mode: "site", maxUrls: 100, targetKeyword: null, lastRunAt: isoDaysAgo(0, 3), lastScore: 88, isActive: true, createdAt: isoDaysAgo(15), updatedAt: isoDaysAgo(0, 3) },
  { id: "sch-02", userId: "dev-bypass-user", url: "https://shopdemo.vn/landing", cron: "0 */6 * * *", mode: "single", maxUrls: null, targetKeyword: "macbook m4", lastRunAt: isoDaysAgo(0, 8), lastScore: 76, isActive: true, createdAt: isoDaysAgo(8), updatedAt: isoDaysAgo(0, 8) },
  { id: "sch-03", userId: "dev-bypass-user", url: "https://agency-pro.com", cron: "0 0 * * 1", mode: "site", maxUrls: 50, targetKeyword: null, lastRunAt: isoDaysAgo(3), lastScore: 81, isActive: false, createdAt: isoDaysAgo(30), updatedAt: isoDaysAgo(3) },
  { id: "sch-04", userId: "dev-bypass-user", url: "https://news-daily.com/tech", cron: "0 8,20 * * *", mode: "single", maxUrls: null, targetKeyword: "ai tin tức", lastRunAt: isoDaysAgo(0, 6), lastScore: 64, isActive: true, createdAt: isoDaysAgo(4), updatedAt: isoDaysAgo(0, 6) },
  { id: "sch-05", userId: "dev-bypass-user", url: "https://portfolio-2026.dev", cron: "0 3 * * 0", mode: "site", maxUrls: 20, targetKeyword: null, lastRunAt: null, lastScore: null, isActive: true, createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1) },
];

const adminUsersSeed: Array<{ id: string; email: string; name: string; role: "user" | "admin"; verified: boolean; locked: boolean; oauth: string | null; audits: number; createdDays: number }> = [
  { id: "u-001", email: "admin@local", name: "Super Admin", role: "admin", verified: true, locked: false, oauth: null, audits: 142, createdDays: 180 },
  { id: "u-002", email: "minh.nguyen@gmail.com", name: "Nguyễn Minh", role: "user", verified: true, locked: false, oauth: "google", audits: 38, createdDays: 88 },
  { id: "u-003", email: "linh.tran@yahoo.com", name: "Trần Linh", role: "user", verified: true, locked: false, oauth: null, audits: 27, createdDays: 64 },
  { id: "u-004", email: "demo.user@example.com", name: "Demo User", role: "user", verified: false, locked: false, oauth: null, audits: 0, createdDays: 2 },
  { id: "u-005", email: "spam.user@temp-mail.io", name: "Spam Account", role: "user", verified: false, locked: true, oauth: null, audits: 0, createdDays: 12 },
  { id: "u-006", email: "huy.pham@outlook.com", name: "Phạm Huy", role: "user", verified: true, locked: false, oauth: "google", audits: 19, createdDays: 45 },
  { id: "u-007", email: "agency@agency-pro.com", name: "Agency Pro", role: "user", verified: true, locked: false, oauth: null, audits: 88, createdDays: 156 },
  { id: "u-008", email: "test1@gmail.com", name: "Test One", role: "user", verified: true, locked: false, oauth: null, audits: 4, createdDays: 9 },
  { id: "u-009", email: "test2@gmail.com", name: "Test Two", role: "user", verified: true, locked: true, oauth: null, audits: 1, createdDays: 22 },
  { id: "u-010", email: "moderator@local", name: "Moderator", role: "admin", verified: true, locked: false, oauth: null, audits: 56, createdDays: 100 },
  { id: "u-011", email: "thuy.le@gmail.com", name: "Lê Thuý", role: "user", verified: true, locked: false, oauth: "google", audits: 12, createdDays: 30 },
  { id: "u-012", email: "an.dao@hotmail.com", name: "Đào An", role: "user", verified: false, locked: false, oauth: null, audits: 2, createdDays: 5 },
  { id: "u-013", email: "long.vu@gmail.com", name: "Vũ Long", role: "user", verified: true, locked: false, oauth: null, audits: 31, createdDays: 70 },
  { id: "u-014", email: "tester@qa.local", name: "QA Tester", role: "user", verified: true, locked: false, oauth: null, audits: 7, createdDays: 14 },
  { id: "u-015", email: "duc.minhcoder@gmail.com", name: "Minh Đức", role: "admin", verified: true, locked: false, oauth: "google", audits: 220, createdDays: 200 },
];

export const mockAdminUsers: AdminUser[] = adminUsersSeed.map((u) => ({
  id: u.id,
  email: u.email,
  fullName: u.name,
  role: u.role,
  isVerified: u.verified,
  isLocked: u.locked,
  oauthProvider: u.oauth,
  avatarUrl: u.oauth === "google" ? `https://i.pravatar.cc/64?u=${u.id}` : null,
  createdAt: isoDaysAgo(u.createdDays),
  auditCount: u.audits,
}));

export function paginateAdminUsers(
  page = 1,
  limit = 20,
  filter?: { search?: string; role?: "user" | "admin"; isLocked?: "true" | "false" },
): AdminPaginated<AdminUser> {
  let rows = mockAdminUsers;
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    rows = rows.filter((r) => r.email.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q));
  }
  if (filter?.role) rows = rows.filter((r) => r.role === filter.role);
  if (filter?.isLocked) rows = rows.filter((r) => String(r.isLocked) === filter.isLocked);
  const start = (page - 1) * limit;
  return {
    data: rows.slice(start, start + limit),
    meta: { page, limit, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / limit)) },
  };
}

export const mockAdminStats: AdminStats = {
  overview: {
    totalUsers: mockAdminUsers.length,
    totalAudits: 1284,
    successRate: 0.94,
    avgCrawlTimeMs: 2150,
    avgSeoScore: 76.4,
  },
  newUsersToday: 3,
  auditsToday: 47,
  topDomains: [
    { domain: "techblog.io", count: 142 },
    { domain: "agency-pro.com", count: 98 },
    { domain: "shopdemo.vn", count: 76 },
    { domain: "news-daily.com", count: 54 },
    { domain: "portfolio-2026.dev", count: 31 },
  ],
};

export const mockCompare: CompareResult = {
  scoreDelta: 14,
  ruleDeltas: [
    { ruleId: "r-02", ruleName: "meta-description", statusBefore: "CHECK_STATUS_FAIL", statusAfter: "CHECK_STATUS_PASS", scoreDelta: 7 },
    { ruleId: "r-07", ruleName: "image-alt", statusBefore: "CHECK_STATUS_WARN", statusAfter: "CHECK_STATUS_PASS", scoreDelta: 3 },
    { ruleId: "r-11", ruleName: "broken-links", statusBefore: "CHECK_STATUS_FAIL", statusAfter: "CHECK_STATUS_WARN", scoreDelta: 4 },
    { ruleId: "r-15", ruleName: "canonical-url", statusBefore: "CHECK_STATUS_FAIL", statusAfter: "CHECK_STATUS_PASS", scoreDelta: 6 },
  ],
  issuesFixed: ["Thiếu meta description", "Thiếu canonical URL", "Alt text cho ảnh"],
  issuesNew: ["Page size tăng do thêm hero image"],
};

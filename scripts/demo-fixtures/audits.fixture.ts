import { DEMO_AUDIT_IDS, DEMO_USER_IDS } from './ids';
import { daysAgo, hoursAgo } from './helpers';

export type AuditStatus = 'pending' | 'crawling' | 'analyzing' | 'reporting' | 'completed' | 'failed';
export type AuditMode = 'single' | 'site';

export type DemoAuditSeed = {
  id: string;
  userId: string;
  url: string;
  domain: string;
  status: AuditStatus;
  mode: AuditMode;
  seoScore: number | null;
  targetKeyword: string | null;
  errorMessage: string | null;
  crawlerType: string | null;
  crawlDurationMs: number | null;
  discoveredUrlsCount: number | null;
  auditedUrlsCount: number | null;
  completedAt: Date | null;
  createdAt: Date;
};

// Helper to keep the table readable
const a = (
  id: string,
  userId: string,
  url: string,
  status: AuditStatus,
  mode: AuditMode,
  seoScore: number | null,
  daysAgoCreated: number,
  targetKeyword: string | null = null,
  errorMessage: string | null = null,
  options: Partial<DemoAuditSeed> = {},
): DemoAuditSeed => {
  const createdAt = daysAgoCreated < 1 ? hoursAgo(daysAgoCreated * 24) : daysAgo(daysAgoCreated);
  const domain = new URL(url).hostname;
  const completedAt = status === 'completed'
    ? new Date(createdAt.getTime() + 60_000)
    : null;
  return {
    id,
    userId,
    url,
    domain,
    status,
    mode,
    seoScore,
    targetKeyword,
    errorMessage,
    crawlerType: status === 'completed' ? (mode === 'site' ? 'playwright' : 'cheerio') : null,
    crawlDurationMs: status === 'completed' ? 4200 + (parseInt(id.slice(-3), 10) % 5000) : null,
    discoveredUrlsCount: mode === 'site' ? 24 : null,
    auditedUrlsCount: mode === 'site' && status === 'completed' ? 24 : null,
    completedAt,
    createdAt,
    ...options,
  };
};

export const DEMO_AUDITS: DemoAuditSeed[] = [
  // ── Alice — 15 completed single (varied score & domains) ────────────────
  a(DEMO_AUDIT_IDS.ALICE_A01, DEMO_USER_IDS.ALICE, 'https://vnexpress.net/',                   'completed', 'single', 95, 88, 'tin tức'),
  a(DEMO_AUDIT_IDS.ALICE_A02, DEMO_USER_IDS.ALICE, 'https://vnexpress.net/the-thao',           'completed', 'single', 93, 85, 'thể thao'),
  a(DEMO_AUDIT_IDS.ALICE_A03, DEMO_USER_IDS.ALICE, 'https://shopee.vn/',                       'completed', 'single', 91, 80, 'mua sắm online'),
  a(DEMO_AUDIT_IDS.ALICE_A04, DEMO_USER_IDS.ALICE, 'https://tiki.vn/',                         'completed', 'single', 87, 72, 'sách'),
  a(DEMO_AUDIT_IDS.ALICE_A05, DEMO_USER_IDS.ALICE, 'https://thegioididong.com/',               'completed', 'single', 82, 65, 'điện thoại'),
  a(DEMO_AUDIT_IDS.ALICE_A06, DEMO_USER_IDS.ALICE, 'https://fpt.vn/',                          'completed', 'single', 78, 55, 'internet'),
  a(DEMO_AUDIT_IDS.ALICE_A07, DEMO_USER_IDS.ALICE, 'https://vietnamnet.vn/',                   'completed', 'single', 74, 48, 'báo điện tử'),
  a(DEMO_AUDIT_IDS.ALICE_A08, DEMO_USER_IDS.ALICE, 'https://24h.com.vn/',                      'completed', 'single', 71, 42, null),
  a(DEMO_AUDIT_IDS.ALICE_A09, DEMO_USER_IDS.ALICE, 'https://kenh14.vn/',                       'completed', 'single', 68, 36, 'giới trẻ'),
  a(DEMO_AUDIT_IDS.ALICE_A10, DEMO_USER_IDS.ALICE, 'https://dantri.com.vn/',                   'completed', 'single', 62, 30, 'tin tức'),
  a(DEMO_AUDIT_IDS.ALICE_A11, DEMO_USER_IDS.ALICE, 'https://lazada.vn/',                       'completed', 'single', 58, 24, null),
  a(DEMO_AUDIT_IDS.ALICE_A12, DEMO_USER_IDS.ALICE, 'https://my-startup.example.com/',          'completed', 'single', 51, 18, 'fintech startup'),
  a(DEMO_AUDIT_IDS.ALICE_A13, DEMO_USER_IDS.ALICE, 'https://broken-seo.example.com/',          'completed', 'single', 45, 12, null),
  a(DEMO_AUDIT_IDS.ALICE_A14, DEMO_USER_IDS.ALICE, 'https://legacy-site.example.com/',         'completed', 'single', 38, 9, null),
  a(DEMO_AUDIT_IDS.ALICE_A15, DEMO_USER_IDS.ALICE, 'https://abandoned-blog.example.com/',      'completed', 'single', 32, 6, null),

  // ── Alice — in-progress (cover every non-terminal status) ───────────────
  a(DEMO_AUDIT_IDS.ALICE_PENDING,   DEMO_USER_IDS.ALICE, 'https://new-target.example.com/',    'pending',   'single', null, 0.05),
  a(DEMO_AUDIT_IDS.ALICE_CRAWLING,  DEMO_USER_IDS.ALICE, 'https://crawling-demo.example.com/', 'crawling',  'single', null, 0.1),
  a(DEMO_AUDIT_IDS.ALICE_ANALYZING, DEMO_USER_IDS.ALICE, 'https://analyzing-demo.example.com/','analyzing', 'single', null, 0.2),
  a(DEMO_AUDIT_IDS.ALICE_REPORTING, DEMO_USER_IDS.ALICE, 'https://reporting-demo.example.com/','reporting', 'single', null, 0.3),

  // ── Alice — failed (2 different reasons) ────────────────────────────────
  a(DEMO_AUDIT_IDS.ALICE_FAILED_TIMEOUT, DEMO_USER_IDS.ALICE, 'https://timeout.example.com/',
    'failed', 'single', null, 2, null, 'Crawler timeout sau 30s — site không phản hồi'),
  a(DEMO_AUDIT_IDS.ALICE_FAILED_403, DEMO_USER_IDS.ALICE, 'https://blocked.example.com/',
    'failed', 'single', null, 5, null, 'HTTP 403 — site chặn crawler bot'),

  // ── Alice — site-mode (4) ───────────────────────────────────────────────
  a(DEMO_AUDIT_IDS.ALICE_SITE_01, DEMO_USER_IDS.ALICE, 'https://my-portfolio.example.com/',    'completed', 'site', 84, 70, 'portfolio dev'),
  a(DEMO_AUDIT_IDS.ALICE_SITE_02, DEMO_USER_IDS.ALICE, 'https://docs-platform.example.com/',   'completed', 'site', 76, 45, 'docs platform'),
  a(DEMO_AUDIT_IDS.ALICE_SITE_03, DEMO_USER_IDS.ALICE, 'https://saas-pricing.example.com/',    'completed', 'site', 67, 22, 'saas pricing'),
  a(DEMO_AUDIT_IDS.ALICE_SITE_04, DEMO_USER_IDS.ALICE, 'https://e-commerce-demo.example.com/', 'completed', 'site', 55, 10, 'online store'),

  // ── Bob — 8 completed single ────────────────────────────────────────────
  a(DEMO_AUDIT_IDS.BOB_B01, DEMO_USER_IDS.BOB, 'https://medium.com/',                          'completed', 'single', 90, 50, 'blog platform'),
  a(DEMO_AUDIT_IDS.BOB_B02, DEMO_USER_IDS.BOB, 'https://github.com/',                          'completed', 'single', 88, 44, 'code hosting'),
  a(DEMO_AUDIT_IDS.BOB_B03, DEMO_USER_IDS.BOB, 'https://stackoverflow.com/',                   'completed', 'single', 83, 36, 'q&a programming'),
  a(DEMO_AUDIT_IDS.BOB_B04, DEMO_USER_IDS.BOB, 'https://news.ycombinator.com/',                'completed', 'single', 79, 28, 'tech news'),
  a(DEMO_AUDIT_IDS.BOB_B05, DEMO_USER_IDS.BOB, 'https://reddit.com/',                          'completed', 'single', 73, 20, null),
  a(DEMO_AUDIT_IDS.BOB_B06, DEMO_USER_IDS.BOB, 'https://dev.to/',                              'completed', 'single', 70, 14, 'dev community'),
  a(DEMO_AUDIT_IDS.BOB_B07, DEMO_USER_IDS.BOB, 'https://bobs-blog.example.com/',               'completed', 'single', 64, 8, 'personal blog'),
  a(DEMO_AUDIT_IDS.BOB_B08, DEMO_USER_IDS.BOB, 'https://bobs-blog.example.com/post-2',         'completed', 'single', 71, 3, 'tutorial nestjs'),

  // ── Carol — 4 completed + 1 failed, 1 site-mode ─────────────────────────
  a(DEMO_AUDIT_IDS.CAROL_C01, DEMO_USER_IDS.CAROL, 'https://baking-recipes.example.com/',      'completed', 'single', 81, 38, 'bánh mì'),
  a(DEMO_AUDIT_IDS.CAROL_C02, DEMO_USER_IDS.CAROL, 'https://travel-blog.example.com/',         'completed', 'single', 75, 28, 'du lịch đà lạt'),
  a(DEMO_AUDIT_IDS.CAROL_C03, DEMO_USER_IDS.CAROL, 'https://fashion-shop.example.com/',        'completed', 'single', 60, 12, 'thời trang nữ'),
  a(DEMO_AUDIT_IDS.CAROL_C04_SITE, DEMO_USER_IDS.CAROL, 'https://carols-shop.example.com/',    'completed', 'site',   65, 18, 'handmade'),
  a(DEMO_AUDIT_IDS.CAROL_C05_FAILED, DEMO_USER_IDS.CAROL, 'https://invalid.url..example/',
    'failed', 'single', null, 6, null, 'URL không hợp lệ'),

  // ── David — 2 completed (low score profile) ─────────────────────────────
  a(DEMO_AUDIT_IDS.DAVID_D01, DEMO_USER_IDS.DAVID, 'https://davids-homepage.example.com/',     'completed', 'single', 90, 10, 'lập trình viên'),
  a(DEMO_AUDIT_IDS.DAVID_D02, DEMO_USER_IDS.DAVID, 'https://davids-cv.example.com/',           'completed', 'single', 48, 4, 'cv online'),

  // ── OAuth user — 1 completed ────────────────────────────────────────────
  a(DEMO_AUDIT_IDS.OAUTH_O01, DEMO_USER_IDS.OAUTH, 'https://notion.so/',                       'completed', 'single', 89, 25, 'productivity'),

  // ── Locked user — 1 completed (created before lock) ─────────────────────
  a(DEMO_AUDIT_IDS.LOCKED_L01, DEMO_USER_IDS.LOCKED, 'https://locked-demo.example.com/',       'completed', 'single', 55, 35, null),
];

// ── Site-mode page audits (5 pages × 5 site audits = 25) ──────────────────
export type DemoPageAuditSeed = {
  auditId: string;
  url: string;
  score: number;
  issues: Array<{ rule: string; status: 'fail' | 'warn'; message: string }>;
};

const sitePages = (auditId: string, baseUrl: string, scores: number[]): DemoPageAuditSeed[] => {
  const paths = ['/', '/about', '/blog', '/contact', '/services'];
  return paths.slice(0, scores.length).map((path, i) => ({
    auditId,
    url: new URL(path, baseUrl).toString(),
    score: scores[i],
    issues: scores[i] < 70
      ? [
          { rule: 'meta_description', status: 'warn', message: 'Meta description ngắn hơn 120 ký tự' },
          { rule: 'image_alt', status: 'fail', message: '3 ảnh thiếu alt text' },
        ]
      : [{ rule: 'image_optimization', status: 'warn', message: 'Một số ảnh chưa dùng WebP' }],
  }));
};

export const DEMO_PAGE_AUDITS: DemoPageAuditSeed[] = [
  ...sitePages(DEMO_AUDIT_IDS.ALICE_SITE_01, 'https://my-portfolio.example.com/', [88, 85, 82, 80, 86]),
  ...sitePages(DEMO_AUDIT_IDS.ALICE_SITE_02, 'https://docs-platform.example.com/', [80, 75, 72, 78, 74]),
  ...sitePages(DEMO_AUDIT_IDS.ALICE_SITE_03, 'https://saas-pricing.example.com/', [70, 68, 65, 64, 67]),
  ...sitePages(DEMO_AUDIT_IDS.ALICE_SITE_04, 'https://e-commerce-demo.example.com/', [58, 55, 52, 50, 60]),
  ...sitePages(DEMO_AUDIT_IDS.CAROL_C04_SITE, 'https://carols-shop.example.com/', [68, 65, 63, 60, 70]),
];

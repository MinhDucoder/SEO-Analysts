# Tier 1 Upgrade — Brainstorm Report

> Research + integration plan cho 5 feature Tier 1 nâng cấp từ tool "1 URL audit" thành platform site-wide + scheduled. Nguồn uy tín (Google Search Central, web.dev, sitemaps.org, BullMQ, Lighthouse GitHub, RFC, HCMUS). Ngày: 2026-04-17.

## Bối cảnh hiện tại (starting point)

```
┌─────────────────────────────────────────────────┐
│ HIỆN TẠI: 1 URL/audit, 1 lần chạy, on-demand    │
│                                                 │
│  POST /audits  ──▶  BullMQ[crawl.start]          │
│                      └─▶ crawler (Playwright)   │
│                          └─▶ Lighthouse (mobile ONE run)│
│                              └─▶ analyzer (20 rules)   │
│                                  └─▶ report (PDF)      │
└─────────────────────────────────────────────────┘

MỤC TIÊU Tier 1: biến thành site-wide + scheduled + đa dạng rule hơn
```

Tất cả 5 features đều chia sẻ chung 3 insight:

1. **Không đổi contract gRPC** giữa các service — chỉ mở rộng BullMQ queues + Prisma schema
2. **Tái dùng crawler hiện có** — mỗi URL con vẫn đi qua cùng pipeline
3. **Gateway làm orchestrator** — logic mới chủ yếu ở gateway + crawler, ít chạm analyzer/report

---

## FEATURE 1 — Site-wide Crawl từ sitemap.xml

### Hook

Audit 1 URL là chỉ chụp 1 mảnh. Audit toàn site mới trả lời được câu hỏi thật của SEO: "trang nào đang kéo score cả domain xuống?". Đây là feature **impact lớn nhất** trong Tier 1 — biến platform từ "kiểm 1 trang" thành "kiểm domain".

### Protocol spec (nguồn uy tín)

| Giới hạn | Giá trị |
|---|---|
| Max URLs / sitemap file | **50,000** |
| Max file size (uncompressed) | **50 MB** |
| Max Sitemaps / index | **50,000** |
| Sitemap index chỉ chấp nhận sub-sitemap | **cùng host** |
| URL tối đa | **2,048 ký tự** |

> Source: [sitemaps.org/protocol.html](https://www.sitemaps.org/protocol.html)

### Discovery chain (thứ tự fallback)

```
Bước 1: GET /robots.txt                    → parse dòng "Sitemap:"
Bước 2: GET <sitemap URL>                  → nếu là <sitemapindex> → fan-out
Bước 3: GET /sitemap.xml (fallback)        → 80% site dùng path mặc định
Bước 4: Không có sitemap → BFS seed crawl  → homepage + cùng-domain links, depth max 3
```

> Source: [Google Search Central — Build and Submit a Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

### Crawl politeness (quan trọng — tránh bị chặn)

| Rule | Giá trị | Nguồn |
|---|---|---|
| Concurrent requests | **4 threads** (Screaming Frog default) | [RedSEO guide](https://www.redseo.io/blog/how-to-prevent-429-errors-in-screaming-frog) |
| Request rate | **1-2 req/s** per domain | Same |
| Delay giữa requests | **1-5s** tùy tải server | Same |
| User-Agent | `SeoAnalyst/1.0 (+https://yoursite.com/bot)` | Chuẩn RFC |
| Robots crawl-delay | Respect (Ahrefs respect, Google ignore) | [Ahrefs bot docs](https://help.ahrefs.com/en/articles/78158) |
| 429/503 response | Exponential backoff 2s → 4s → 8s → skip | [Google crawl budget](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget) |

**Lưu ý**: Google **không respect** `crawl-delay` trong robots.txt. Ta nên respect nó (khác biệt với Googlebot) vì ta là bot nhỏ, không có crawl budget bảo hộ.

### Integration vào codebase hiện tại

```
apps/crawler/src/crawler/
├── services/
│   ├── crawler.service.ts          (hiện có)
│   ├── sitemap-discovery.service.ts  ← MỚI: fetch robots.txt + sitemap chain
│   ├── url-canonicalizer.service.ts  ← MỚI: dedup, strip session IDs
│   └── crawl-orchestrator.service.ts ← MỚI: fan-out con
├── infra/fetchers/
│   └── polite-fetcher.ts           ← MỚI: concurrency + backoff
```

**BullMQ queue mới** cần thêm vào `@repo/shared`:

```typescript
// packages/shared/src/constants/bullmq.ts
export const BULLMQ_QUEUES = {
  // ...existing
  siteCrawl: {
    start:    'site-crawl.start',     // user request audit 1 domain
    urlAudit: 'site-crawl.url-audit', // 1 job per URL con
    aggregate:'site-crawl.aggregate', // collect all results
  },
};
```

### Step-by-step flow

```
User POST /audits { url: "https://example.com", mode: "site" }
│
├─▶ gateway/audits.service.ts
│     tạo Audit row (status=PENDING, mode=SITE)
│     enqueue 'site-crawl.start' với { auditId, rootUrl }
│
├─▶ crawler/site-crawl-start.worker
│     1. fetch robots.txt → parse Sitemap: directives
│     2. fetch sitemap(s) → flatten → max N URLs (config 100/500/5000)
│     3. canonicalize + dedup URLs
│     4. lưu vào Redis set: audit:<id>:urls
│     5. fan-out: enqueue N × 'site-crawl.url-audit'
│
├─▶ crawler/url-audit.worker (N parallel instances)
│     với từng URL: gọi existing crawler pipeline
│     → save PageAudit { auditId, url, score, issues[] }
│     → publish progress: audit:<id>:progress = done/total
│
└─▶ crawler/aggregate.worker (trigger khi counter = N)
      compute domain-level score (avg, median, worst pages top 10)
      save SiteReport → emit 'report.done'
```

### Prisma schema thay đổi

```prisma
// apps/gateway/prisma/schema.prisma
model Audit {
  id          String      @id @default(uuid())
  url         String
  mode        AuditMode   @default(SINGLE)  // ← MỚI
  // ... existing fields
  pageAudits  PageAudit[]                    // ← MỚI reverse relation
}

enum AuditMode {
  SINGLE   // legacy
  SITE     // sitemap crawl
}

model PageAudit {               // ← MỚI
  id        String   @id @default(uuid())
  auditId   String
  url       String
  score     Int
  issues    Json
  fetchedAt DateTime @default(now())
  audit     Audit    @relation(fields: [auditId], references: [id])
  @@index([auditId])
  @@index([score])
}
```

### Edge cases (từ research)

- **Faceted URLs** (`?filter=...&sort=...`): filter theo whitelist query params, drop rest
- **Session IDs** (`jsessionid`, `PHPSESSID`): strip khi canonicalize
- **Trailing slash**: normalize → always có/không slash
- **Hreflang alternates**: skip (cùng content, khác locale)
- **Pagination**: giữ page=1-5, skip còn lại
- **Domain boundary**: chỉ crawl URLs có cùng eTLD+1 với root

### Effort estimate

- **~1200 dòng TS** (sitemap parse 200 + polite fetcher 200 + orchestrator 300 + worker 300 + tests 200)
- **2 bảng Prisma mới** (Audit.mode + PageAudit)
- **3 BullMQ queues mới**
- **~2 tuần dev** cho 1 người

---

## FEATURE 2 — Scheduled Audits (Cron)

### Hook

Audit on-demand chỉ dùng 1 lần. SEO thật sự là **monitoring liên tục**: phát hiện khi score tụt vì ai đó sửa robots.txt, đổi title, hoặc Cloudflare thay đổi config. Đây là feature giữ user quay lại mỗi tuần.

### BullMQ Job Scheduler (v5+) — API mới

```typescript
// CÁCH MỚI (BullMQ v5.16+) — repeatable jobs bị deprecated
await queue.upsertJobScheduler(
  `audit-schedule-${userId}-${auditConfigId}`,
  { pattern: '0 9 * * MON' },           // cron: 9h sáng thứ Hai
  // HOẶC
  { every: 7 * 24 * 3600_000 },          // 7 ngày
  { name: 'run-scheduled-audit', data: { userId, targetUrl } }
);
```

> Source: [docs.bullmq.io/guide/job-schedulers](https://docs.bullmq.io/guide/job-schedulers)

**Khác biệt quan trọng** với `repeat: {...}` cũ:

- `upsertJobScheduler` là **idempotent** — gọi lại cùng key không tạo duplicate
- Scheduler sống trong Redis → survive restart, nhưng instance worker cần re-register on boot
- Cancel: `queue.removeJobScheduler(schedulerId)`

> Source: [BullMQ v5 migration notes](https://bullmq.io/news/231221/bullmqv5-release/)

### Per-user scheduling pattern (anti-pattern vs correct)

**Sai**: tạo 1 queue mới per user → leak memory trong Redis

**Đúng**: 1 queue `scheduled-audits` duy nhất, scheduler ID keyed theo composite:

```
scheduler-id = `sched:<userId>:<auditConfigId>`
```

Xóa user → query Redis `SCAN MATCH sched:<userId>:*` → `removeJobScheduler` each.

### Integration vào codebase

```
apps/gateway/src/
├── scheduled-audits/              ← MỚI module
│   ├── controllers/               POST/GET/DELETE /scheduled-audits
│   ├── services/
│   │   ├── scheduler.service.ts   upsert + cancel
│   │   └── regression-detector.service.ts  listen completed event
│   └── dto/
```

**Prisma schema thêm**:

```prisma
model ScheduledAudit {
  id          String   @id @default(uuid())
  userId      String
  url         String
  cron        String    // "0 9 * * MON"
  mode        AuditMode // SINGLE | SITE
  lastRunAt   DateTime?
  lastScore   Int?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id])
}

model AuditAlert {
  id          String   @id @default(uuid())
  auditId     String
  type        AlertType  // SCORE_DROP | NEW_ISSUES | SITE_DOWN
  deltaScore  Int?
  message     String
  sentAt      DateTime?
  createdAt   DateTime @default(now())
}
```

### Alert-on-regression pattern (best practice)

Dùng **BullMQ event listener** + follow-up job chain:

```typescript
// apps/gateway/src/scheduled-audits/services/regression-detector.service.ts
@Processor(BULLMQ_QUEUES.audit.completed)
export class RegressionDetector {
  @OnWorkerEvent('completed')
  async handle(job: Job) {
    const { auditId, score } = job.returnvalue;
    const schedule = await this.prisma.scheduledAudit.findFirst({ where: { /* ... */ } });
    if (!schedule) return;

    const drop = schedule.lastScore - score;
    if (drop > 10) {  // threshold
      await this.alertQueue.add('send-email', { userId, drop, auditId });
    }
    await this.prisma.scheduledAudit.update({
      where: { id: schedule.id },
      data: { lastScore: score, lastRunAt: new Date() }
    });
  }
}
```

### Step-by-step: user tạo scheduled audit

```
1. POST /scheduled-audits { url, cron: "0 9 * * MON" }
2. Gateway validate cron (cron-parser lib), save ScheduledAudit row
3. Gateway gọi: queue.upsertJobScheduler(`sched:${userId}:${row.id}`, { pattern: row.cron }, {...})
4. BullMQ tự trigger mỗi thứ Hai 9h:
   → worker nhận job → enqueue normal 'crawl.start' với auditId
   → pipeline chạy như audit on-demand
   → regression-detector listen 'completed' → compare → alert nếu drop
```

### On boot re-register

```typescript
// apps/gateway/src/main.ts bootstrap
const activeSchedules = await prisma.scheduledAudit.findMany({ where: { isActive: true } });
for (const s of activeSchedules) {
  await queue.upsertJobScheduler(`sched:${s.userId}:${s.id}`, { pattern: s.cron }, {...});
}
```

### Effort estimate

- **~400 dòng TS** (CRUD module + scheduler service + regression detector + tests)
- **2 bảng Prisma mới**
- **~3-4 ngày** cho 1 người

---

## FEATURE 3 — Flesch-Kincaid Readability Rule

### Hook

Google đã công khai nói content dễ đọc rank tốt hơn — "content quality" là yếu tố E-E-A-T. Thêm rule readability là cú đánh 2 trong 1: rule SEO mới + tăng giá trị cho content writer.

### Công thức (1 rule, 2 metric)

```
Flesch Reading Ease (FRE):
  206.835 − 1.015 × (words/sentences) − 84.6 × (syllables/words)

Flesch-Kincaid Grade (FKG):
  0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59
```

> Source: [Flesch–Kincaid tests — Wikipedia](https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests)

### Score interpretation (bảng chấm)

| FRE | Grade | Classification | Weight |
|---|---|---|---|
| 90-100 | 5th grade | Very easy | PASS |
| 60-70 | 8th-9th grade | **Plain English** sweet spot | PASS |
| 50-60 | 10th-12th | Fairly difficult | WARN |
| 30-50 | College | Difficult | WARN |
| 0-30 | College graduate | Very difficult | FAIL |

> Source: [ReadabilityFormulas.com](https://readabilityformulas.com/learn-about-the-flesch-reading-ease-formula/) — 60-70 là target cho US DoD standards

### Implementation (tiếng Anh)

**NPM package khuyến nghị**: `text-readability-ts` hoặc `flesch-kincaid` + `syllable`

```typescript
// apps/seo-analyzer/src/analyzer/domain/rules/content/readability.rule.ts
import { syllable } from 'syllable';

export class ReadabilityRule implements SeoRule {
  name = 'content.readability';
  weight = 3;

  run(page: PageData) {
    const text = this.extractText(page.html);  // strip <script>, <style>, then .textContent
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.trim().split(/\s+/).length;
    const syllables = text.split(/\s+/).reduce((sum, w) => sum + syllable(w), 0);

    if (sentences === 0 || words === 0) return this.skip('No text content');

    const fre = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    const grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;

    return {
      status: fre >= 60 ? CheckStatus.PASS : fre >= 30 ? CheckStatus.WARN : CheckStatus.FAIL,
      fre: Math.round(fre * 10) / 10,
      grade: Math.round(grade * 10) / 10,
      wordsPerSentence: (words / sentences).toFixed(1),
      syllablesPerWord: (syllables / words).toFixed(2),
    };
  }
}
```

### Gotcha — Vietnamese

Flesch được thiết kế cho English phonology. Tiếng Việt là **monosyllabic** (mỗi tiếng = 1 âm tiết), nên công thức Flesch **không áp dụng trực tiếp**.

> Source: [Assessing Vietnamese Text Readability — HCMUS research](https://thesai.org/Downloads/Volume11No8/Paper_14-Assessing_Vietnamese_Text_Readability.pdf)

**Giải pháp cho tiếng Việt**:

- Chỉ dùng Flesch cho page có `<html lang="en">`
- Nếu `lang="vi"`: tính simple metric thay thế — **avg words/sentence** + **% từ ngoại lai (tiếng Anh trộn trong văn bản VN)**
- Skip rule nếu không detect được ngôn ngữ

### Effort

- **~100 dòng TS** bao gồm tokenize + language detect + test
- **1-2 ngày** cho 1 người
- **NPM dependencies**: `syllable` (3KB), `franc` cho language detect (optional)

---

## FEATURE 4 — Broken Link Audit

### Hook

Broken links làm hỏng crawl budget của Google và phá UX. Audit hiện tại chỉ đếm số link → lên thêm tier status code check.

### Scope quyết định

| Scope | Internal (cùng domain) | External |
|---|---|---|
| Weight trong score | **High** (crawlability) | **Low** (UX only) |
| Check depth | All `<a href>` trong trang | All `<a href>` trong trang |
| Follow redirect | Có, max 5 hop | Có, max 5 hop |

> Source: [Google Search Central — SEO link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) + [RFC 7231 §6.4](https://datatracker.ietf.org/doc/html/rfc7231)

### HTTP method chiến thuật

```
Bước 1: HEAD request (nhanh, không tốn bandwidth)
Bước 2: Nếu status = 405 hoặc 501 → fallback GET
Bước 3: Nếu ECONNRESET / ETIMEDOUT → retry 1 lần sau 2s
```

**Lý do fallback**: Cloudflare + một số CDN **block HEAD** hoặc trả status khác GET. RFC 7231 nói HEAD phải giống GET nhưng nhiều impl vi phạm.

### Status code matrix

| Status | Classification | Action |
|---|---|---|
| 2xx | OK | pass |
| 301/302/307/308 | Redirect | follow (max 5 hop) |
| **3+ redirect hops** | **WARN** | SEO smell, ghi log chain |
| 4xx (không 429) | Broken | FAIL |
| 429 | Rate limited | backoff, retry |
| 5xx | Server error | retry 1 lần, nếu vẫn fail → WARN (không FAIL, có thể tạm thời) |
| `ECONNREFUSED`, `ENOTFOUND` | Broken | FAIL |

### Concurrency + timeout (anti-DDoS)

```typescript
const SETTINGS = {
  concurrency: 10,           // 10 fetch song song toàn trang
  perHostConcurrency: 2,     // max 2 đến cùng host (tránh DDoS domain đối tác)
  timeoutMs: 5000,           // 5s per request
  maxRedirects: 5,
  retries: 1,                // retry 1 lần với exponential backoff
};
```

> Source: [Screaming Frog issue: external no response](https://www.screamingfrog.co.uk/seo-spider/issues/response-codes/external-no-response/) — industry default 20s, nhưng cho audit tool thì 5s đủ

### Implementation

```typescript
// apps/crawler/src/crawler/services/link-checker.service.ts
import { fetch } from 'undici';  // faster than node built-in
import pLimit from 'p-limit';

async checkLinks(html: string, baseUrl: string): Promise<LinkCheckResult[]> {
  const links = this.extractLinks(html, baseUrl);
  const limit = pLimit(10);
  const hostLimits = new Map<string, ReturnType<typeof pLimit>>();

  return Promise.all(links.map(link => limit(async () => {
    const host = new URL(link.href).host;
    const hostLimit = hostLimits.get(host) ?? pLimit(2);
    hostLimits.set(host, hostLimit);
    return hostLimit(() => this.checkOne(link));
  })));
}

async checkOne(link: LinkInfo): Promise<LinkCheckResult> {
  const chain: string[] = [];
  let url = link.href;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    }).catch(e => ({ status: 0, error: e.code }));

    if (res.status === 405 || res.status === 501) {
      return this.checkOne({ ...link, method: 'GET' });  // fallback
    }
    if (res.status >= 300 && res.status < 400) {
      chain.push(url);
      url = res.headers.get('location');
      continue;
    }
    return { ...link, status: res.status, chain, isBroken: res.status >= 400 || res.status === 0 };
  }
  return { ...link, status: 0, chain, isBroken: true, reason: 'TOO_MANY_REDIRECTS' };
}
```

### Integration

Rule mới trong seo-analyzer: `links/broken-links.rule.ts` — consume data từ crawler (crawler mới sẽ attach `linkChecks[]` vào PageData).

### Effort

- **~200 dòng TS** (link-checker service + rule + test)
- **NPM**: `undici` (performant fetch), `p-limit` (concurrency control)
- **~3-4 ngày** cho 1 người

---

## FEATURE 5 — Mobile + Desktop Lighthouse Split

### Hook

Google đã **mobile-first indexing từ 2021**. Score mobile = score SEO thật. Nhưng user vẫn muốn thấy desktop score để so sánh + fix regression desktop-only.

> Source: [Chrome for Developers — Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)

### Mobile vs Desktop preset (số thật)

| | Mobile (default) | Desktop |
|---|---|---|
| Viewport | **412 × 823** | **1350 × 940** |
| Device pixel ratio | 1.75 | 1 |
| CPU throttle | **4x slower** | None |
| Network | **Slow 4G** (1.6Mbps down, 150ms RTT) | **10Mbps cable** |
| Typical score gap | — | **+10 đến +50 điểm** cao hơn mobile |

> Source: [GoogleChrome/lighthouse — core/config/constants.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js)

### Code change trong crawler

```typescript
// apps/crawler/src/crawler/services/lighthouse.service.ts
async runLighthouse(url: string, formFactor: 'mobile' | 'desktop') {
  const config = formFactor === 'desktop'
    ? { extends: 'lighthouse:default', settings: { preset: 'desktop' } }
    : { extends: 'lighthouse:default' };  // mobile is default
  return lighthouse(url, { port: chromePort }, config);
}

// Gọi 2 lần (chạy song song nếu đủ RAM, tuần tự nếu < 2GB)
const [mobile, desktop] = await Promise.all([
  this.runLighthouse(url, 'mobile'),
  this.runLighthouse(url, 'desktop'),
]);
```

### Dual-run cost

- **RAM**: 300-600 MB mỗi run → **600-1200 MB** nếu parallel
- **Time**: ~doubles total audit time (từ ~5s lên ~10s)
- **Hardware**: máy dev 8GB đủ, Railway plan cần ≥1GB service

> Source: [Lighthouse throttling docs](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)

**Quyết định**: chạy **tuần tự** mặc định, cho option `LIGHTHOUSE_PARALLEL=true` env flag nếu server đủ RAM.

### Data model — Option A (recommend)

```prisma
model Audit {
  // ... existing
  mobileScore        Int?
  mobileLcpMs        Int?
  mobileFcpMs        Int?
  mobileClsScore     Float?
  mobileInpMs        Int?

  desktopScore       Int?
  desktopLcpMs       Int?
  desktopFcpMs       Int?
  desktopClsScore    Float?
  desktopInpMs       Int?
}
```

**Lý do Option A** (single row với prefix) thay vì separate table:

- Query "so sánh mobile vs desktop" = 0 JOIN
- Reporting UI hiển thị side-by-side dễ
- Prisma migration đơn giản

### Effort

- **~150 dòng TS** (Lighthouse service modification + Prisma update)
- **Migration**: 10 columns mới trong Audit
- **~2-3 ngày** cho 1 người

---

## Cross-cutting — Sequencing & Dependencies

### Dependency graph

```
                    [F2] Scheduled Audits
                         │ (cần F1 hoặc single-mode)
                         ▼
[F5] Mobile+Desktop ──▶ [F1] Site-wide Crawl ──▶ [F4] Broken Links
    (low risk, DB only)   (big win, biggest work)    (tái dùng crawler cycle)
                         │
                         ▼
                    [F3] Readability
                (độc lập, 1 rule, plug in bất cứ lúc nào)
```

### Đề xuất thứ tự thực hiện

| Tuần | Feature | Lý do |
|---|---|---|
| **1** | F5 Mobile+Desktop + F3 Readability | Low risk, chỉ đổi rule engine, validate flow mới không break cũ |
| **2-3** | F1 Site-wide Crawl | Big feature, cần refactor BullMQ topology |
| **4** | F4 Broken Links | Tái dùng site-wide crawler (mỗi URL check links) |
| **5** | F2 Scheduled Audits | Đặt cuối — khi single + site audit đã stable |

### Shared infra changes (chạm tất cả services)

1. **`@repo/shared/constants/bullmq.ts`** — thêm 3 queue mới
2. **`@repo/shared/interfaces/`** — thêm `PageAuditData`, `LinkCheckResult`, `LighthouseScores`
3. **`@repo/shared/enums/`** — thêm `AuditMode`, `AlertType`, `FormFactor`
4. **3 Prisma migrations** (gateway: ScheduledAudit, PageAudit, Audit cols; seo-analyzer: không đổi; report: SiteReport aggregate)

### Testing strategy

| Feature | Unit | Integration | E2E |
|---|---|---|---|
| F1 Site-wide | sitemap parser, URL canonicalizer | full site crawl 20 URLs | e2e:smoke mở rộng |
| F2 Scheduled | cron parse, regression detector | BullMQ upsert roundtrip | simulate 1 tick manual |
| F3 Readability | formula correctness (known texts) | — | — |
| F4 Broken links | status matrix, redirect chain | page with 50 links | — |
| F5 Dual Lighthouse | — | real URL, check both scores present | — |

---

## Total scope

| Feature | Lines TS | Prisma changes | Effort |
|---|---|---|---|
| F1 Site-wide crawl | ~1200 | 2 tables + 1 enum | 2 tuần |
| F2 Scheduled audits | ~400 | 2 tables | 4 ngày |
| F3 Readability | ~100 | 0 | 2 ngày |
| F4 Broken links | ~200 | 1 field (JSON array) | 4 ngày |
| F5 Dual Lighthouse | ~150 | 10 columns | 3 ngày |
| **Total** | **~2050** | **5 tables, 10+ cols** | **~5 tuần / 1 người** |

---

## Master source list (deduplicated)

**Sitemap + Crawl**

- [sitemaps.org/protocol.html](https://www.sitemaps.org/protocol.html) — spec chính thức
- [Google Search Central — Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search Central — Crawl budget](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget)
- [Google Search Central — robots.txt spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Ahrefs — bot crawl behaviour](https://help.ahrefs.com/en/articles/78158)
- [RedSEO — prevent 429 errors](https://www.redseo.io/blog/how-to-prevent-429-errors-in-screaming-frog)

**BullMQ**

- [docs.bullmq.io/guide/job-schedulers](https://docs.bullmq.io/guide/job-schedulers) — API mới
- [bullmq.io/news/231221/bullmqv5-release/](https://bullmq.io/news/231221/bullmqv5-release/) — migration

**Lighthouse**

- [GoogleChrome/lighthouse — config/constants.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js)
- [GoogleChrome/lighthouse — throttling.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- [Chrome for Developers — Performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
- [DebugBear — score discrepancies](https://www.debugbear.com/blog/lighthouse-score-discrepancies)

**Readability**

- [Wikipedia — Flesch-Kincaid tests](https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests)
- [ReadabilityFormulas.com](https://readabilityformulas.com/learn-about-the-flesch-reading-ease-formula/)
- [thesai.org — Vietnamese readability (HCMUS)](https://thesai.org/Downloads/Volume11No8/Paper_14-Assessing_Vietnamese_Text_Readability.pdf)

**Broken links**

- [RFC 7231](https://datatracker.ietf.org/doc/html/rfc7231)
- [Google — Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Screaming Frog — external no response](https://www.screamingfrog.co.uk/seo-spider/issues/response-codes/external-no-response/)

---

**Kết bài**: Tier 1 = **~5 tuần dev** cho 1 người, không cần thêm external API trả phí, dùng 100% infra hiện có (BullMQ + Redis + Postgres + Playwright + Lighthouse). Impact lớn nhất nằm ở **F1 (site-wide)** — sau khi có F1 thì F4 và F2 gần như "free" vì tái dùng pipeline.

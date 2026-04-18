# 05 — Report Service

> **Vai trò:** Người đóng gói — đợi analyzer + keyword xong, gộp thành điểm cuối, lưu snapshot, xuất PDF, quản lý share link.
>
> **Port:** 3004 (HTTP — cho PDF export) + 50055 (gRPC — gateway gọi).
>
> **Database:** `seo_report` (Postgres) — Report, ReportKeyword, ReportCwv, ShareLink.

---

## 1. Mục đích & Trách nhiệm

1. **Fan-in coordination** — lắng 2 event (`analyze.done` + `keyword.done`), đếm counter; khi đủ 2 → enqueue `report.start`.
2. **Score aggregation** — blend analyzer overall (0.7) + Lighthouse performance (0.3) → final score.
3. **Issue classification** — đếm critical issue (FAIL + weight ≥ 7), phân loại `excellent/good/fair/poor`.
4. **Persist** snapshot đầy đủ (analysis JSON, CWV JSON, keyword list) vào Postgres.
5. **PDF generation** — Playwright (Chromium pool) + Handlebars template → A4 PDF hỗ trợ tiếng Việt.
6. **Share link** — tạo token 256-bit, public read endpoint, revoke soft-delete, track access count.
7. **Compare** — so sánh 2 audit (delta score, rule trước/sau).

**Triết lý:** service cuối pipeline, chịu trách nhiệm "close the loop" — trả kết quả user có thể xem/tải/share.

---

## 2. Kiến trúc module

```
apps/report/src/
├── main.ts                            # Bootstrap HTTP + gRPC
├── app.module.ts                      # Root: ConfigModule + PrismaModule + RedisModule + ReportModule
├── report/
│   ├── report.module.ts               # DI + queue register
│   ├── controllers/
│   │   ├── report.grpc.controller.ts  # 8 gRPC RPC
│   │   ├── report.http.controller.ts  # GET /audits/:id/export (PDF)
│   │   ├── report.worker.ts           # BullMQ @Processor('report.start')
│   │   ├── analyze-done.listener.ts   # Redis sub: analyze.done
│   │   ├── keyword-done.listener.ts   # Redis sub: keyword.done
│   │   └── crawl-done.listener.ts     # Redis sub: crawl.done (cache CWV)
│   ├── services/
│   │   ├── report.service.ts          # Facade: generateFromPipeline / getReport / compare
│   │   ├── report.aggregator.ts       # Blend score, count critical issues
│   │   ├── report.comparator.ts       # Delta logic
│   │   ├── wait-for-both.service.ts   # Counter + trigger logic
│   │   └── share-link.service.ts      # Token lifecycle
│   ├── persistence/
│   │   └── report.repository.ts       # Prisma transactional writer
│   └── domain/
│       ├── analyze-result.interface.ts
│       ├── keyword-result.interface.ts
│       └── report-payload.interface.ts
└── infra/
    ├── pdf/
    │   ├── pdf.module.ts
    │   ├── pdf.generator.ts           # Playwright render + Handlebars
    │   ├── browser-pool.ts            # Chromium pool (size 2)
    │   └── templates/
    │       ├── report.hbs             # Main template
    │       └── report.css             # A4 print styles
    ├── prisma/
    │   ├── prisma.module.ts           # @Global()
    │   └── prisma.service.ts
    └── redis/
        ├── redis.module.ts
        └── redis.service.ts           # command + subscriber client
```

---

## 3. Fan-in coordination (WaitForBothService)

### 3.1 Sơ đồ logic

```
analyze.done channel              keyword.done channel
         │                                │
         ▼                                ▼
AnalyzeDoneListener              KeywordDoneListener
   ├─ cache payload                 ├─ cache payload
   │  audit:{id}:analyze_result     │  audit:{id}:keyword_result
   │                                │
   └─► WaitForBothService.recordAnalyzeDone(auditId, payload)
       WaitForBothService.recordKeywordDone(auditId, payload)
                           │
                           ▼
                  maybeTrigger(auditId)
                           │
                           ├─ redis.INCR audit:{id}:completed_steps
                           │
                           └─ IF count == 2:
                                BullMQ.add('report.start', { auditId })
```

### 3.2 Code

File: [wait-for-both.service.ts](../../apps/report/src/report/services/wait-for-both.service.ts).

```typescript
async recordAnalyzeDone(auditId: string, payload: AnalyzeResult) {
  await this.redis.setex(
    REDIS_KEYS.auditAnalyzeResult(auditId),
    CACHE_TTL.AUDIT_RESULT_SECONDS,
    JSON.stringify(payload)
  );
  await this.maybeTrigger(auditId);
}

async recordKeywordDone(auditId: string, payload: KeywordResult) {
  await this.redis.setex(REDIS_KEYS.auditKeywordResult(auditId), 3600, JSON.stringify(payload));
  await this.maybeTrigger(auditId);
}

private async maybeTrigger(auditId: string) {
  const count = await this.redis.incr(REDIS_KEYS.auditCompletedSteps(auditId));
  if (count === 2) {
    await this.reportStartQueue.add('report.start', { auditId });
    // Cleanup counter sau X giây tránh key leak
    await this.redis.expire(REDIS_KEYS.auditCompletedSteps(auditId), 600);
  }
}
```

### 3.3 Đặc điểm

- **Thứ tự 2 signal không quan trọng** — ai đến trước incr trước, đạt 2 là trigger.
- **Idempotent**: nếu vì lý do gì 1 signal được publish 2 lần (retry BullMQ), counter lên 3+, `== 2` check không match → không enqueue duplicate. An toàn.
- **TTL counter 1h (ngầm):** Redis cache payload có TTL 1h; counter key cũng nên có TTL (`expire` gọi khi đạt 2). Nếu audit fail 1 signal, counter stuck mãi → key leak → TTL là cần thiết.

### 3.4 CrawlDoneListener

[crawl-done.listener.ts](../../apps/report/src/report/controllers/crawl-done.listener.ts) — không tham gia counter, chỉ cache CWV:

```typescript
await this.redis.setex(
  REDIS_KEYS.auditCrawlResult(auditId),
  3600,
  JSON.stringify({ cwv, cwvDesktop, url, domain, ... })
);
```

Lý do tách riêng: `crawl.done` xảy ra **trước** analyze + keyword. Khi report worker chạy, nó đọc cả 3 key từ Redis.

---

## 4. Report worker

File: [report.worker.ts](../../apps/report/src/report/controllers/report.worker.ts).

```typescript
@Processor(BULLMQ_QUEUES.REPORT_START)
export class ReportWorker extends WorkerHost {
  async process(job: Job<{ auditId }>) {
    const { auditId } = job.data;

    // 1. Đọc 3 cache
    const analyze = await this.getCache(REDIS_KEYS.auditAnalyzeResult(auditId));
    const keyword = await this.getCache(REDIS_KEYS.auditKeywordResult(auditId));
    const crawl   = await this.getCache(REDIS_KEYS.auditCrawlResult(auditId));

    const url    = analyze?.url ?? crawl?.url ?? 'unknown';
    const domain = analyze?.domain ?? crawl?.domain ?? new URL(url).hostname;
    const cwv        = crawl?.cwv;
    const cwvDesktop = crawl?.cwvDesktop;

    // 2. Publish progress
    await this.publishProgress(auditId, { progress: 85, stage: 'reporting' });

    // 3. Generate
    const report = await this.reportService.generateFromPipeline({
      auditId, url, domain, analyze, keyword, cwv, cwvDesktop,
    });

    return { reportId: report.id, finalScore: report.finalScore };
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error) {
    const auditId = job.data.auditId;
    await this.redis.publish('audit.failed', JSON.stringify({ auditId, error: err.message }));
  }
}
```

**`reportService.generateFromPipeline()`** ([report.service.ts](../../apps/report/src/report/services/report.service.ts)):

```
1. aggregate() → { finalScore, classification, criticalIssues, ... }
2. repository.persist() inside Prisma transaction:
     INSERT Report + ReportKeyword[] + ReportCwv
3. Redis PUBLISH report.done { auditId, reportId, finalScore, classification }
4. Redis PUBLISH audit.completed { auditId, finalScore, reportId, classification }
```

**Tại sao publish cả `report.done` + `audit.completed`?**
- `report.done` — signal cho các service khác (nếu có) biết report đã lưu.
- `audit.completed` — signal tập trung để gateway cập nhật `Audit.status = COMPLETED`.
- Gateway xử lý cả 2 nhưng có idempotent guard (xem [01-gateway.md §6](01-gateway.md#6-redis-pubsub--gateway-là-subscriber)).

---

## 5. Aggregation logic

File: [report.aggregator.ts](../../apps/report/src/report/services/report.aggregator.ts).

### 5.1 Final score

```typescript
const ANALYZER_WEIGHT = 0.7;
const CWV_WEIGHT = 0.3;

const blended = analyze.overallScore * ANALYZER_WEIGHT
              + (cwv?.performanceScore ?? 0) * CWV_WEIGHT;
const finalScore = Math.round(blended);
```

**Công thức:**
$$\text{finalScore} = 0.7 \times \text{analyzerOverall} + 0.3 \times \text{cwvPerformanceScore}$$

**Ví dụ:** analyzer = 80, CWV performance = 65 → finalScore = 0.7×80 + 0.3×65 = 56 + 19.5 = 75.5 → `76`.

**Lý do chọn 70/30?** Rule SEO là hành vi lâu dài (title, heading, link...), performance là trải nghiệm người dùng tức thời. Thiết kế cân bằng ủng hộ rule (70%) nhưng không bỏ qua UX (30%).

### 5.2 Critical issues

```typescript
const CRITICAL_WEIGHT_THRESHOLD = 7;

let criticalIssues = 0;
let warnIssues = 0;
let passCount = 0;

for (const rule of analyze.ruleResults) {
  if (rule.status === CheckStatus.FAIL && rule.weight >= CRITICAL_WEIGHT_THRESHOLD) {
    criticalIssues++;
  } else if (rule.status === CheckStatus.WARN) {
    warnIssues++;
  } else if (rule.status === CheckStatus.PASS) {
    passCount++;
  }
}

const totalIssues = analyze.ruleResults.length;
```

**Tại sao weight ≥ 7?** Rule quan trọng như `https_check`, `http_status`, `title_tag`, `viewport_meta` đều weight 8–10. Rule cosmetic như `favicon` (weight 2), `language_tag` (weight 4) không critical.

### 5.3 Classification

```typescript
classification = classify(finalScore);  // imported từ @repo/shared
```

| Score | Classification |
|---|---|
| ≥ 80 | excellent |
| 60–79 | good |
| 40–59 | fair |
| < 40 | poor |

---

## 6. PDF generation

### 6.1 Browser pool

File: [browser-pool.ts](../../apps/report/src/infra/pdf/browser-pool.ts).

```typescript
@Injectable()
export class BrowserPool implements OnModuleInit, OnModuleDestroy {
  private browsers: Browser[] = [];
  private cursor = 0;
  private readonly POOL_SIZE = 2;

  async onModuleInit() {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.browsers.push(await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      }));
    }
  }

  acquire(): Browser {
    return this.browsers[this.cursor++ % this.browsers.length];
  }

  async onModuleDestroy() {
    await Promise.all(this.browsers.map(b => b.close()));
  }
}
```

**Round-robin:** cursor tăng mỗi lần acquire → tự load balance 2 browser.

**Pool size = 2:** đủ cho workload thấp, không để Chromium idle hoá hết RAM. Mỗi browser ~200 MB.

**`--disable-dev-shm-usage`:** trong container, `/dev/shm` thường nhỏ (64 MB) → Chromium crash. Flag này đẩy về disk thay vì shared memory.

### 6.2 Render

File: [pdf.generator.ts](../../apps/report/src/infra/pdf/pdf.generator.ts).

```typescript
async generate(data: ReportTemplateData): Promise<Buffer> {
  const html = this.handlebars.compile(templateStr)(data);
  const browser = this.pool.acquire();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(html, { waitUntil: 'networkidle' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', right: '18mm', bottom: '18mm', left: '18mm' },
  });

  await context.close();
  return pdf;
}
```

**Context per render** (không reuse) — tránh cookie/session leak giữa các audit khác nhau.

### 6.3 Template

File: [report.hbs](../../apps/report/src/infra/pdf/templates/report.hbs).

Cấu trúc 7 phần (theo convention báo cáo SEO):

1. **Cover page** — domain, final score badge, classification, ngày xuất.
2. **Executive summary** — top 3 critical issue.
3. **Category score bars** — meta/headings/images/links/technical/performance/content.
4. **Core Web Vitals grid** — LCP, INP, CLS (mobile + desktop).
5. **Detailed rule results** — group by category, liệt kê 21 rule với message + suggestion.
6. **Top 20 keywords table** — keyword, frequency, density %, placement flags.
7. **Footer** — generation timestamp + watermark project.

### 6.4 Font tiếng Việt

File: [report.css](../../apps/report/src/infra/pdf/templates/report.css).

```css
body {
  font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
```

**Không nhúng webfont** — Chromium trong Linux container dùng font hệ thống. Image Docker báo `Ubuntu` hoặc `Debian slim` đã có DejaVu/Liberation fonts hỗ trợ Unicode đầy đủ → render tiếng Việt tốt.

**Nếu prod deploy trên platform đặc biệt** (Alpine không có fonts mặc định), cần `apk add --no-cache ttf-dejavu fontconfig` trong Dockerfile.

### 6.5 Endpoint

File: [report.http.controller.ts](../../apps/report/src/report/controllers/report.http.controller.ts).

```
GET /audits/:id/export[?format=pdf]
 ├─ Validate format == 'pdf' (chặn xss/injection future-proof)
 ├─ reportRepository.findByAuditId(id)
 ├─ pdfGenerator.generate(data) → Buffer
 ├─ Response headers:
 │    Content-Type: application/pdf
 │    Content-Disposition: attachment; filename="audit-{domain}-{yyyymmdd}.pdf"
 └─ Stream buffer
```

**Chú ý:** gateway `GET /api/v1/audits/:id/export` trả 302 Redirect về `http://report:3004/audits/:id/export`. Client (browser) follow redirect, download trực tiếp từ report service.

---

## 7. Share link

### 7.1 Token generation

File: [share-link.service.ts](../../apps/report/src/report/services/share-link.service.ts).

```typescript
import { randomBytes } from 'crypto';

async create(auditId: string) {
  const report = await this.reportRepository.findByAuditId(auditId);
  const token = randomBytes(32).toString('hex');  // 64 char hex = 256 bits
  return this.prisma.shareLink.create({
    data: { auditId, reportId: report.id, token, isActive: true },
  });
}
```

**256-bit entropy:** 2^256 kombinace → brute-force không khả thi. Hex encode để URL-safe không cần base64url.

### 7.2 Lifecycle

| Action | Behavior |
|---|---|
| Create | INSERT row, return token |
| Lookup (public) | `findFirst({ where: { token, isActive: true } })` + INCR `accessedCount`, set `lastAccessedAt` |
| Revoke | UPDATE `isActive = false` (soft delete, giữ lịch sử) |

Public endpoint (gateway): `GET /api/v1/shared/audits/:token` → gRPC `ReportService.GetSharedReport(token)` → trả snapshot.

### 7.3 Data model

```prisma
model ShareLink {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  reportId       String   @unique @map("report_id") @db.Uuid
  auditId        String   @map("audit_id") @db.Uuid
  token          String   @unique @db.VarChar(64)
  isActive       Boolean  @default(true) @map("is_active")
  accessedCount  Int      @default(0) @map("accessed_count")
  lastAccessedAt DateTime? @map("last_accessed_at") @db.Timestamptz
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  report Report @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@index([auditId], name: "idx_sl_audit")
  @@map("share_links")
}
```

**Unique trên `reportId`** — mỗi report chỉ có 1 share link active/inactive. Muốn regenerate → revoke rồi create lại.

---

## 8. Mô hình dữ liệu

Database `seo_report`. Schema: [apps/report/prisma/schema.prisma](../../apps/report/prisma/schema.prisma).

### `Report`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `auditId` | UUID unique | 1–1 với Audit |
| `url`, `domain` | Text, VarChar(255) | Denorm cho query nhanh không join |
| `finalScore` | Decimal(5,2) | 0–100 |
| `classification` | VarChar(20) | excellent/good/fair/poor |
| `totalIssues` | Int | Tổng rule chạy |
| `criticalIssues` | Int | FAIL + weight≥7 |
| `warnIssues` | Int | |
| `passCount` | Int | |
| `analysisSnapshot` | JsonB | Full analyzer response (để compare) |
| `cwvSnapshot` | JsonB | Full Lighthouse result |
| `createdAt` | Timestamptz | |

Index: `idx_reports_domain(domain)` — list báo cáo cùng domain.

**Tại sao snapshot JSON?**
- ReportKeyword + ReportCwv là denorm cho query nhanh.
- `analysisSnapshot` giữ nguyên cấu trúc raw → khi compare 2 report, có thể đào sâu rule-by-rule mà không join thêm bảng.

### `ReportKeyword`

| Field | Type |
|---|---|
| `id` | UUID |
| `reportId` | UUID FK CASCADE |
| `keyword` | VarChar(255) |
| `frequency` | Int |
| `densityPercent` | Decimal(5,2) |
| `inTitle`, `inH1`, `inFirstParagraph`, `inMetaDescription` | Boolean |
| `rank` | Int (1–20) |
| `isTarget` | Boolean default false — target keyword của user |

Index: `idx_rk_report(reportId)`.

### `ReportCwv`

| Field | Type |
|---|---|
| `id` | |
| `reportId` | UUID unique |
| **Mobile metrics** | `lcpMs`, `inpMs`, `cls`, `performanceScore`, `accessibilityScore`, `bestPracticesScore`, `lighthouseSeoScore` |
| **Desktop metrics** (nullable) | `desktopLcpMs`, `desktopInpMs`, `desktopCls`, `desktopPerformanceScore`, ... |

**Desktop nullable:** audit cũ chỉ có mobile. Feature desktop thêm sau nên giữ backward compatible.

### `ShareLink`

(Xem §7.3.)

---

## 9. gRPC exposed RPCs

Proto: `packages/proto/report/v1/report.proto`.

| RPC | Request | Response | Gọi từ |
|---|---|---|---|
| `GenerateReport` | `{ audit_id, url, domain, analysis, keywords, cwv_metrics }` | `{ report_id, audit_id, final_score, classification, ... }` | Admin / test |
| `GetReport` | `{ audit_id }` | Full report object | gateway `GET /audits/:id` |
| `CompareReports` | `{ audit1_id, audit2_id }` | `{ score_delta, rule_delta[], issues_fixed, issues_new }` | gateway `GET /audits/compare` |
| `CreateShareLink` | `{ audit_id, user_id }` | `{ share_token, share_url }` | gateway `POST /audits/:id/share` |
| `GetSharedReport` | `{ token }` | Full report (public) | gateway `GET /shared/audits/:token` |
| `RevokeShareLink` | `{ audit_id, user_id }` | `{ ok }` | gateway `DELETE /audits/:id/share` |
| `GeneratePdf` | `{ audit_id }` | `{ pdf_content: bytes, filename, size_bytes }` | (chưa dùng — HTTP endpoint tiện hơn) |
| `HealthCheck` | `{}` | `{ healthy }` | gateway `/health` |

---

## 10. Redis pub/sub

### Publish

| Channel | Payload | Khi nào |
|---|---|---|
| `report.done` | `{ auditId, reportId, finalScore, classification }` | Sau khi persist xong |
| `audit.completed` | `{ auditId, reportId, finalScore, classification }` | Cùng lúc |
| `audit.failed` | `{ auditId, error }` | Khi worker throw |
| `audit.progress` | `{ auditId, status: REPORTING, progress: 85, stage: 'reporting' }` | Giữa report worker |

### Subscribe

| Channel | Listener | Action |
|---|---|---|
| `analyze.done` | AnalyzeDoneListener | Cache + counter |
| `keyword.done` | KeywordDoneListener | Cache + counter |
| `crawl.done` | CrawlDoneListener | Cache CWV |

---

## 11. Khởi động

File: [apps/report/src/main.ts](../../apps/report/src/main.ts).

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // gRPC
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['report.v1'],
      protoPath: [join(PROTO_ROOT, 'report/v1/report.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50055}`,
      loader: { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true, includeDirs: [PROTO_ROOT] },
    },
  });

  await app.startAllMicroservices();

  // HTTP
  const httpPort = process.env.HTTP_PORT || 3004;
  await app.listen(httpPort);
}
```

**Hybrid:** HTTP (cho PDF) + gRPC (cho gateway) cùng 1 process.

**Env vars:**
- `HTTP_PORT` (3004)
- `GRPC_PORT` (50055)
- `REPORT_DATABASE_URL`
- `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`

---

## 12. File tham chiếu quan trọng

| File | Mục đích |
|---|---|
| [src/main.ts](../../apps/report/src/main.ts) | Bootstrap |
| [report/report.module.ts](../../apps/report/src/report/report.module.ts) | DI |
| [prisma/schema.prisma](../../apps/report/prisma/schema.prisma) | Data model |
| [report/services/wait-for-both.service.ts](../../apps/report/src/report/services/wait-for-both.service.ts) | Fan-in counter |
| [report/services/report.aggregator.ts](../../apps/report/src/report/services/report.aggregator.ts) | Score blend |
| [report/services/report.service.ts](../../apps/report/src/report/services/report.service.ts) | Facade |
| [report/services/share-link.service.ts](../../apps/report/src/report/services/share-link.service.ts) | Token lifecycle |
| [report/services/report.comparator.ts](../../apps/report/src/report/services/report.comparator.ts) | Delta compute |
| [report/persistence/report.repository.ts](../../apps/report/src/report/persistence/report.repository.ts) | Transactional writer |
| [report/controllers/analyze-done.listener.ts](../../apps/report/src/report/controllers/analyze-done.listener.ts) | Redis sub |
| [report/controllers/keyword-done.listener.ts](../../apps/report/src/report/controllers/keyword-done.listener.ts) | Redis sub |
| [report/controllers/crawl-done.listener.ts](../../apps/report/src/report/controllers/crawl-done.listener.ts) | Cache CWV |
| [report/controllers/report.worker.ts](../../apps/report/src/report/controllers/report.worker.ts) | BullMQ processor |
| [report/controllers/report.grpc.controller.ts](../../apps/report/src/report/controllers/report.grpc.controller.ts) | 8 gRPC RPC |
| [report/controllers/report.http.controller.ts](../../apps/report/src/report/controllers/report.http.controller.ts) | PDF HTTP endpoint |
| [infra/pdf/pdf.generator.ts](../../apps/report/src/infra/pdf/pdf.generator.ts) | Playwright + Handlebars |
| [infra/pdf/browser-pool.ts](../../apps/report/src/infra/pdf/browser-pool.ts) | Chromium pool |
| [infra/pdf/templates/report.hbs](../../apps/report/src/infra/pdf/templates/report.hbs) | PDF template |
| [infra/pdf/templates/report.css](../../apps/report/src/infra/pdf/templates/report.css) | A4 print style |
| [packages/proto/report/v1/report.proto](../../packages/proto/report/v1/report.proto) | gRPC contract |

---

## 13. Điểm nâng cấp khả dĩ

- **Template variants:** hiện 1 template duy nhất. Có thể cho user chọn theme (minimal/detailed/executive).
- **Chart rendering:** hiện chỉ bar bằng CSS. Dùng `chart.js` render server-side rồi embed SVG sẽ đẹp hơn.
- **Compare UX:** CompareReports trả delta JSON. Frontend hiện hiển thị table; có thể thêm side-by-side PDF diff.
- **Scheduled reports:** cron job audit lại domain mỗi tuần, email PDF. Cần integrate email service.
- **White-label:** cho agency xoá watermark + thêm logo riêng. Monetization path.
- **Webhook on complete:** khi `audit.completed`, POST tới webhook URL user cấu hình → tích hợp Slack/Discord.
- **Streaming PDF:** hiện render xong buffer mới trả. Với PDF lớn có thể stream chunk.

---

## 14. Đi tiếp

- Xem toàn bộ queue + event → [22-job-pipeline.md](22-job-pipeline.md)
- Xem ERD 3 DB → [20-data-model.md](20-data-model.md)
- Xem các gRPC RPC ngang hàng → [21-api-contracts.md](21-api-contracts.md)

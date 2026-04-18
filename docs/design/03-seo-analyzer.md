# 03 — SEO Analyzer Service

> **Vai trò:** Đầu bếp — chạy 22 rule SEO trên `PageData` → chấm điểm từng rule + điểm tổng + phân loại.
>
> **Port:** 50053 (gRPC).
>
> **Database:** `seo_analyzer` (Postgres) — `SeoRule` (22 rule + weight admin tinh chỉnh) và `RuleResult` (snapshot kết quả mỗi audit).

---

## 1. Mục đích & Trách nhiệm

1. **Áp dụng 22 rule** lên PageData → mỗi rule trả `{status, score, message, suggestion, metadata}`.
2. **Chấm điểm tổng** = weighted average của 22 rule.
3. **Chấm điểm category** (meta/headings/images/links/performance/technical/content).
4. **Phân loại** 0–100 → excellent/good/fair/poor.
5. **Persist** kết quả vào Postgres cho lịch sử + compare.
6. **Expose admin API** (qua gRPC) để gateway đổi weight rule mà không cần deploy.
7. **Publish `analyze.done`** → report service gom.

**Triết lý:** rule engine thuần — không fetch HTML, không đo CWV. Input là `PageData` đã trích xuất; output là điểm + kết quả có thể hiển thị lên UI.

---

## 2. Kiến trúc module

```
apps/seo-analyzer/src/
├── main.ts                            # Bootstrap: gRPC + BullMQ
├── app.module.ts                      # Root
├── analyzer/
│   ├── analyzer.module.ts             # DI + BullMQ registerQueue
│   ├── controllers/
│   │   ├── analyzer.controller.ts     # gRPC @GrpcMethod: AnalyzePage, ListRules, UpdateRuleWeight, ...
│   │   └── analyzer.worker.ts         # BullMQ @Processor('analyze.start')
│   ├── services/
│   │   ├── analyzer.service.ts        # Orchestrator: analyze(auditId, pageData, targetKeyword?)
│   │   ├── rule-registry.ts           # In-memory Map<id, ISeoRule> lookup
│   │   ├── rule-runner.ts             # Invoke 21 impl.check() + error isolation
│   │   └── score-calculator.ts        # Weighted average + classification
│   └── domain/
│       ├── seo-rule.interface.ts      # ISeoRule contract + RuleCheckOutput
│       ├── page-data.interface.ts
│       └── rules/                     # 22 rule implementations (§4)
│           ├── index.ts               # registerAllRules()
│           ├── meta/ (4 rule)
│           ├── headings/ (2 rule)
│           ├── images/ (2 rule)
│           ├── links/ (3 rule)
│           ├── technical/ (9 rule)
│           ├── performance/ (1 rule)
│           └── content/ (1 rule)
└── infra/
    └── prisma/
        ├── prisma.module.ts
        └── prisma.service.ts
```

---

## 3. Rule engine

### 3.1 Interface `ISeoRule`

File: [seo-rule.interface.ts](../../apps/seo-analyzer/src/analyzer/domain/seo-rule.interface.ts).

```typescript
export interface ISeoRule {
  readonly id: string;                 // unique key, vd "title_tag"
  readonly category: IssueCategory;    // meta|headings|images|links|performance|technical|content
  check(pageData: PageData, targetKeyword?: string): RuleCheckOutput;
}

export interface RuleCheckOutput {
  status: CheckStatus;                 // pass | warn | fail
  score: number;                       // 0 | 50 | 100
  message: string;
  suggestion: string | null;
  metadata: Record<string, unknown>;
}
```

**Quy ước điểm:**
- `100 = PASS` — rule thoả mãn tối ưu.
- `50 = WARN` — chấp nhận được nhưng chưa tối ưu.
- `0 = FAIL` — vi phạm hoặc thiếu.

### 3.2 Registry + loading

File: [rule-registry.ts](../../apps/seo-analyzer/src/analyzer/services/rule-registry.ts).

```typescript
class RuleRegistry {
  private rules = new Map<string, ISeoRule>();
  register(rule: ISeoRule): void       // throw nếu duplicate id
  get(id: string): ISeoRule | undefined
  getAll(): ISeoRule[]
  getByCategory(category: IssueCategory): ISeoRule[]
}
```

**Chiến lược nạp rule:**
- **Implementations nằm trong code** (21 class TypeScript) — logic kiểm tra, không đổi trong production.
- **Metadata (weight, enabled) nằm trong DB** (`SeoRule` table) — admin đổi runtime.
- Khi `AnalyzerService.onModuleInit()`, gọi `registerAllRules(registry)` ([rules/index.ts](../../apps/seo-analyzer/src/analyzer/domain/rules/index.ts)) → populate in-memory map.
- Khi `analyze()` chạy, query DB `SeoRule.findMany({ isEnabled: true })` → lookup impl từ registry theo `rule.name` → chạy `impl.check()` → gắn metadata DB (weight, ruleId) vào result.

**Hệ quả:**
- Thêm rule mới → phải code + deploy + seed DB row.
- Tắt/bật rule hoặc đổi weight → chỉ update DB, không restart.

### 3.3 Rule runner (error isolation)

File: [rule-runner.ts](../../apps/seo-analyzer/src/analyzer/services/rule-runner.ts).

Mỗi rule chạy trong try/catch. Nếu `impl.check()` throw → runner trả `RuleCheckOutput { status: FAIL, score: 0, message: 'Rule execution failed', metadata: { error } }` và **tiếp tục rule tiếp theo**. Một rule chết không stall cả analyze.

---

## 4. Bộ 22 rule

File thư mục: [apps/seo-analyzer/src/analyzer/domain/rules/](../../apps/seo-analyzer/src/analyzer/domain/rules/).

### Meta (4 rule)

| # | ID | File | Kiểm gì | Weight gợi ý |
|---|---|---|---|---|
| 1 | `title_tag` | meta/title-tag.rule.ts | `<title>` có và độ dài 50–60 (PASS), 30–70 (WARN), else FAIL | 10 |
| 2 | `meta_description` | meta/meta-description.rule.ts | `<meta name=description>` có và 120–160 (PASS), 80–200 (WARN) | 8 |
| 3 | `open_graph` | meta/open-graph.rule.ts | Đủ `og:title, og:description, og:image` (3/3 PASS, ≥1 WARN, 0 FAIL) | 5 |
| 4 | `twitter_card` | meta/twitter-card.rule.ts | Có `twitter:card` tag → PASS, thiếu → FAIL | 3 |

### Headings (2 rule)

| # | ID | File | Kiểm gì | Weight |
|---|---|---|---|---|
| 5 | `h1_tag` | headings/h1-tag.rule.ts | Đúng 1 `<h1>`; optionally chứa `targetKeyword` | 9 |
| 6 | `heading_hierarchy` | headings/heading-hierarchy.rule.ts | `h1→h2→h3` không nhảy cóc | 6 |

### Images (2 rule)

| # | ID | File | Kiểm gì | Weight |
|---|---|---|---|---|
| 7 | `image_alt` | images/image-alt.rule.ts | ≥90% ảnh có `alt` (PASS), 70–90% (WARN), <70% (FAIL) | 7 |
| 8 | `image_optimization` | images/image-optimization.rule.ts | WebP/AVIF + <200 KB; chấm theo % issue | 4 |

### Links (3 rule)

| # | ID | File | Kiểm gì | Weight |
|---|---|---|---|---|
| 9 | `internal_links` | links/internal-links.rule.ts | ≥3 internal link (PASS), 1–2 (WARN), 0 (FAIL) | 5 |
| 10 | `external_links` | links/external-links.rule.ts | External link có `rel="noopener"`; không broken 4xx/5xx | 4 |
| 11 | `broken_links` (F4) | links/broken-links.rule.ts | Dùng `LinkInfo.statusCode` crawler populate: internal broken = FAIL (hại crawl budget), external broken = WARN (chỉ UX). Skip khi `includeLinkChecks=false` | 7 |

### Technical (9 rule)

| # | ID | File | Kiểm gì | Weight |
|---|---|---|---|---|
| 12 | `canonical_url` | technical/canonical-url.rule.ts | `<link rel=canonical>` có + same-domain | 7 |
| 13 | `robots_meta` | technical/robots-meta.rule.ts | Không `noindex`; `nofollow` → WARN | 6 |
| 14 | `viewport_meta` | technical/viewport-meta.rule.ts | `<meta name=viewport content=width=device-width>` | 8 |
| 15 | `https_check` | technical/https-check.rule.ts | URL là HTTPS | 10 |
| 16 | `schema_org` | technical/schema-org.rule.ts | Có ≥1 `<script type=application/ld+json>` | 5 |
| 17 | `http_status` | technical/http-status.rule.ts | 200 PASS, 301/302 WARN, else FAIL | 10 |
| 18 | `url_structure` | technical/url-structure.rule.ts | URL ngắn, lowercase, dùng dash, không query phức tạp | 3 |
| 19 | `language_tag` | technical/language-tag.rule.ts | `<html lang="...">` có | 4 |
| 20 | `favicon` | technical/favicon.rule.ts | `<link rel=icon>` có | 2 |

### Performance (1 rule)

| # | ID | File | Kiểm gì | Weight |
|---|---|---|---|---|
| 21 | `page_size` | performance/page-size.rule.ts | HTML <2MB (PASS), 2–5MB (WARN), >5MB (FAIL) | 4 |

### Content (1 rule)

| # | ID | File | Kiểm gì | Weight |
|---|---|---|---|---|
| 22 | `readability` (F3) | content/readability.rule.ts | Flesch Reading Ease (chỉ cho tiếng Anh); ≥60 PASS, 30–60 WARN. Skip cho tiếng Việt (monosyllabic) | 4 |

**Lưu ý:**
- Weight gợi ý dựa trên [prisma/seed.ts](../../apps/seo-analyzer/prisma/seed.ts) khi seed lần đầu. Admin có thể override runtime.
- Rule `readability` skip khi `language != 'en'` hoặc text < 30 từ (tránh tính Flesch trên tiếng Việt không chính xác).

---

## 5. Thuật toán chấm điểm

File: [score-calculator.ts](../../apps/seo-analyzer/src/analyzer/services/score-calculator.ts).

### 5.1 Điểm tổng (overall)

```typescript
overall(results: RunnerResult[]): number {
  const totalWeighted = results.reduce((s, r) => s + r.score * r.weight, 0);
  const totalWeight   = results.reduce((s, r) => s + r.weight, 0);
  return Math.round((totalWeighted / totalWeight) * 100) / 100;
}
```

**Công thức:**
$$
\text{overallScore} = \frac{\sum (score_i \times weight_i)}{\sum weight_i}
$$

Ví dụ: rule title_tag (score=100, weight=10), rule meta_description (score=50, weight=8), các rule còn lại fail (score=0, weight ~4 mỗi cái, tổng ~50) →

$overall = (100 \times 10 + 50 \times 8 + 0 \times 50) / (10+8+50) = 1400 / 68 ≈ 20.6$

### 5.2 Điểm theo category

Cùng công thức, nhóm theo `IssueCategory`. Trả `CategoryScore[]` với:

```typescript
{
  category: IssueCategory.META,
  score: 85.5,
  totalRules: 4,
  passed: 2,
  warned: 1,
  failed: 1,
}
```

### 5.3 Phân loại

```typescript
classify(score: number): Classification {
  if (score >= 80) return Classification.EXCELLENT;
  if (score >= 60) return Classification.GOOD;
  if (score >= 40) return Classification.FAIR;
  return Classification.POOR;
}
```

### 5.4 Kết hợp với CWV (thực hiện bởi Report service)

Analyzer **chỉ trả rule score 0–100**. Report service sẽ blend với CWV:

$$\text{finalScore} = 0.7 \times \text{analyzerOverall} + 0.3 \times \text{cwvPerformanceScore}$$

Chi tiết xem [05-report.md §5](05-report.md).

---

## 6. BullMQ consumer: `analyze.start`

File: [analyzer.worker.ts](../../apps/seo-analyzer/src/analyzer/controllers/analyzer.worker.ts).

```typescript
@Processor(BULLMQ_QUEUES.ANALYZE_START)
export class AnalyzerWorker extends WorkerHost {
  async process(job: Job<AnalyzeJobData>) {
    const { auditId, pageData, targetKeyword } = job.data;
    const result = await this.analyzer.analyze(auditId, pageData, targetKeyword);

    // Cache kết quả cho report service dùng
    await this.redis.setex(
      REDIS_KEYS.auditAnalyzeResult(auditId),
      CACHE_TTL.AUDIT_RESULT_SECONDS,         // 3600s
      JSON.stringify(result)
    );

    // Đánh dấu step completed cho fan-in counter
    await this.redis.sadd(REDIS_KEYS.auditCompletedSteps(auditId), 'analyze');

    // Publish event
    await this.redis.publish('analyze.done', JSON.stringify({
      auditId,
      status: AuditStatus.ANALYZING,
      stage: 'analyze',
      progress: 66,
      message: `Analyzer finished: score ${result.overallScore}`,
    }));
  }
}
```

**Input payload:**
```typescript
interface AnalyzeJobData {
  auditId: string;
  pageData: PageData;
  targetKeyword?: string;
}
```

**`AnalyzerService.analyze()`** ([analyzer.service.ts](../../apps/seo-analyzer/src/analyzer/services/analyzer.service.ts)):

```
1. Load DB: SeoRule.findMany({ where: { isEnabled: true } })
2. For each enabled rule:
    a. impl = registry.get(rule.name)
    b. output = runner.runSafe(impl, pageData, targetKeyword)
    c. push to runnerResults[]
3. overallScore = scoreCalculator.overall(runnerResults)
4. categoryScores = scoreCalculator.byCategory(runnerResults)
5. Prisma TRANSACTION: RuleResult.createMany(21 row)
6. Return { auditId, overallScore, ruleResults, categoryScores, classification }
```

---

## 7. gRPC exposed RPCs

Proto: `packages/proto/analyzer/v1/analyzer.proto`.

| RPC | Request | Response | Mục đích |
|---|---|---|---|
| `AnalyzePage` | `{ audit_id, page_data, target_keyword? }` | `{ audit_id, rule_results[], category_scores[], overall_score, classification }` | Sync analyze (dùng cho F1 site audit gọi từ crawler) |
| `ListRules` | `{}` | `{ rules: SeoRule[] }` | Admin list all rule |
| `GetRulesByCategory` | `{ category }` | `{ rules: SeoRule[] }` | Filter theo category |
| `UpdateRuleWeight` | `{ rule_id, new_weight }` | `{ rule }` | Admin đổi weight (1–10) |
| `HealthCheck` | `{}` | `{ healthy, version }` | Liveness |

**AnalyzePage** được dùng bởi:
- Crawler `UrlAuditWorker` — F1 per-URL audit (sync call).
- Admin tooling (nếu cần test rule thủ công).

**ListRules, UpdateRuleWeight** được dùng bởi:
- Gateway `AdminController` → `AnalyzerGrpcClient.listRules()` / `updateRuleWeight()`.

---

## 8. Admin API flow

```
Admin UI → PUT /api/v1/admin/rules [ { ruleId, weight } ]
   │
   ▼
gateway.AdminController.updateRules
   │ (JwtAuthGuard + RolesGuard)
   ▼
gateway.AdminService.updateRules
   │
   ▼
gateway.AnalyzerGrpcClient.updateRuleWeight(ruleId, weight)
   │ gRPC :50053
   ▼
seo-analyzer.AnalyzerController.updateRuleWeight
   │
   ▼
seo-analyzer.AnalyzerService.updateRuleWeight
   ├─ Validate: weight ∈ [1, 10], integer
   ├─ Prisma: SeoRule.update({ where: { id }, data: { weight } })
   └─ Return updated row

Tiếp theo: lần analyze() tiếp theo query DB → dùng weight mới.
```

**Không cần restart** — weight thay đổi có hiệu lực ngay lần audit sau. Rule impl không đổi nên không cần deploy.

---

## 9. Mô hình dữ liệu

Database: `seo_analyzer`. Schema: [apps/seo-analyzer/prisma/schema.prisma](../../apps/seo-analyzer/prisma/schema.prisma).

### 9.1 Enum

```prisma
enum RuleCategory { meta, headings, images, links, performance, technical, content }
enum CheckStatus  { pass, warn, fail }
```

### 9.2 `SeoRule`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VarChar(100) unique | Key impl, vd `"title_tag"` |
| `displayName` | VarChar(100) | Hiển thị UI, vd `"Title tag"` |
| `description` | Text | Giải thích tiếng Việt |
| `category` | RuleCategory | Nhóm |
| `weight` | Int 1–10 | Admin tinh chỉnh |
| `isEnabled` | Boolean default true | Admin tắt/bật |
| `checkConfig` | JsonB nullable | **Reserved** — chưa dùng; dự phòng cho rule có tham số (vd min-length) |
| `createdAt`, `updatedAt` | Timestamptz | |

Index: `idx_rules_category` — list nhanh trong UI admin.

**Seeding:** [prisma/seed.ts](../../apps/seo-analyzer/prisma/seed.ts) chạy 1 lần khi container start → insert 21 row với weight mặc định.

### 9.3 `RuleResult`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `auditId` | UUID | FK logic tới Audit (không có constraint — cross-DB) |
| `ruleId` | VarChar(100) | Match `SeoRule.name` |
| `ruleName` | VarChar(100) | Display name snapshot (tránh lose khi rule bị rename) |
| `category` | RuleCategory | |
| `status` | CheckStatus | pass/warn/fail |
| `score` | Decimal(5,2) | 0, 50, 100 |
| `weight` | Int | Snapshot của weight lúc chạy (tránh lose khi admin đổi) |
| `message` | Text | Giải thích tiếng Việt cho user |
| `suggestion` | Text nullable | Gợi ý sửa |
| `metadata` | JsonB nullable | Context-specific (vd list image thiếu alt) |
| `createdAt` | Timestamptz | |

Indexes:
- `idx_rr_audit(auditId)` — lấy all result của 1 audit
- `idx_rr_audit_status(auditId, status)` — thống kê pass/warn/fail

**Tại sao snapshot `ruleName`, `weight`, `category`?**
- Nếu admin đổi weight hôm nay, audit cũ vẫn reflect weight **tại thời điểm chạy**.
- Nếu admin rename rule, UI không hiển thị "undefined".

---

## 10. Redis pub/sub

### Publish

| Channel | Payload | Consumer |
|---|---|---|
| `analyze.done` | `{ auditId, status, stage, progress, message }` | Report (`AnalyzeDoneListener` → WaitForBoth) |

### Redis keys

| Key | TTL | Mục đích |
|---|---|---|
| `audit:{id}:analyze_result` | 3600s | Cache full result cho report aggregator |
| `audit:{id}:completed_steps` | — | Set chứa `'analyze'` khi worker xong (report dùng fan-in counter) |

---

## 11. Khởi động

File: [apps/seo-analyzer/src/main.ts](../../apps/seo-analyzer/src/main.ts).

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['analyzer.v1'],
      protoPath: [join(PROTO_ROOT, 'analyzer/v1/analyzer.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50053}`,
      loader: { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true, includeDirs: [PROTO_ROOT] },
    },
  });

  await app.startAllMicroservices();
  await app.init();
}
```

**Startup sequence:**
1. DI container khởi tạo tất cả provider.
2. `AnalyzerService.onModuleInit()` → `registerAllRules(registry)` — populate 22 rule impl.
3. Prisma connect `ANALYZER_DATABASE_URL`, check migrations.
4. gRPC listener bind 0.0.0.0:50053.
5. BullMQ worker listen `analyze.start` queue.

**Env vars:**
- `GRPC_PORT` (default 50053)
- `ANALYZER_DATABASE_URL`
- `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`

---

## 12. File tham chiếu quan trọng

| File | Mục đích |
|---|---|
| [src/main.ts](../../apps/seo-analyzer/src/main.ts) | Bootstrap |
| [analyzer/analyzer.module.ts](../../apps/seo-analyzer/src/analyzer/analyzer.module.ts) | DI + queue register |
| [analyzer/controllers/analyzer.controller.ts](../../apps/seo-analyzer/src/analyzer/controllers/analyzer.controller.ts) | 5 gRPC RPC |
| [analyzer/controllers/analyzer.worker.ts](../../apps/seo-analyzer/src/analyzer/controllers/analyzer.worker.ts) | BullMQ processor |
| [analyzer/services/analyzer.service.ts](../../apps/seo-analyzer/src/analyzer/services/analyzer.service.ts) | Orchestrator |
| [analyzer/services/rule-registry.ts](../../apps/seo-analyzer/src/analyzer/services/rule-registry.ts) | In-memory map |
| [analyzer/services/rule-runner.ts](../../apps/seo-analyzer/src/analyzer/services/rule-runner.ts) | Error-isolated runner |
| [analyzer/services/score-calculator.ts](../../apps/seo-analyzer/src/analyzer/services/score-calculator.ts) | Weighted scoring |
| [analyzer/domain/seo-rule.interface.ts](../../apps/seo-analyzer/src/analyzer/domain/seo-rule.interface.ts) | Rule contract |
| [analyzer/domain/rules/index.ts](../../apps/seo-analyzer/src/analyzer/domain/rules/index.ts) | registerAllRules() |
| [analyzer/domain/rules/](../../apps/seo-analyzer/src/analyzer/domain/rules/) | Thư mục 22 rule (meta, headings, images, links, technical, performance, content) |
| [prisma/schema.prisma](../../apps/seo-analyzer/prisma/schema.prisma) | Data model |
| [prisma/seed.ts](../../apps/seo-analyzer/prisma/seed.ts) | Seed 22 rule |
| [packages/proto/analyzer/v1/analyzer.proto](../../packages/proto/analyzer/v1/analyzer.proto) | gRPC contract |

---

## 13. Điểm nâng cấp khả dĩ

- **checkConfig**: hiện DB có field này nhưng chưa dùng. Có thể biến một số threshold (title length min/max, image size) thành cấu hình runtime — giảm code change khi đổi policy.
- **i18n rule message**: message đang hardcode tiếng Việt. Nếu mở rộng sang tiếng Anh, chuyển sang `messageKey` + translation map.
- **Custom rule (user-defined)**: hiện 22 rule cố định. Có thể cho user viết rule bằng JS sandbox (vm2) — rủi ro security cao, cần cân nhắc.
- **Rule performance impact analysis**: mỗi rule có cost khác nhau. Có thể log latency per rule để phát hiện rule chậm.
- **Delta vs thresholds**: rule hiện chỉ trả status 3-level. Có thể mở rộng thành score continous 0–100 cho rule liên tục (vd `image_alt` có thể trả % theo tỷ lệ).

---

## 14. Đi tiếp

- Xem report gộp analyzer + keyword thế nào → [05-report.md](05-report.md)
- Xem queue + event flow → [22-job-pipeline.md](22-job-pipeline.md)
- Xem ERD đầy đủ → [20-data-model.md](20-data-model.md)

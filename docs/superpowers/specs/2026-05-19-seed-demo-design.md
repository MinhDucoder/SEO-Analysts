# Seed Demo — Full-case Demo Data for SEO Analysts

**Date:** 2026-05-19
**Status:** Approved (user authorized auto-decide on remaining details)
**Owner:** improve/main branch

## 1. Mục tiêu

Tạo dataset demo "full case" cho đồ án:
- Cover **mọi enum value** xuyên 3 service DB (gateway, seo-analyzer, report).
- Volume vừa phải, **hand-curated** để chụp screenshot demo nhất quán.
- **Idempotent** — chạy lại không trùng dữ liệu (upsert theo UUID cố định).
- **Tách rời** seed auto của container — không nhiễm vào staging/prod.

## 2. Phạm vi (Out / In)

**In:**
- 3 DB Postgres: `seo_gateway`, `seo_analyzer`, `seo_report`.
- Cross-DB ID consistency (Audit.id ↔ RuleResult.auditId ↔ Report.auditId).

**Out:**
- Redis state (BullMQ jobs, pub/sub, rate limiter buckets) — không seed; demo chỉ cần DB.
- Real Lighthouse/crawl artifacts — không re-run crawler, snapshot CWV cứng trong fixture.
- File uploads/PDF — file PDF do `report` service generate on-demand từ Report row.

## 3. Architecture

```
SEO-Analysts/
├── scripts/
│   ├── seed-demo.ts                       # Root orchestrator
│   └── demo-fixtures/
│       ├── index.ts                       # Re-exports
│       ├── ids.ts                         # Tất cả UUID cố định (prefix 99999999-...)
│       ├── helpers.ts                     # hashPassword (bcrypt), hashApiKey (sha256), date helpers
│       ├── users.fixture.ts               # 8 demo users
│       ├── audits.fixture.ts              # 42 audits + page-audits
│       ├── rule-results.fixture.ts        # Generator: audit + score → 22 RuleResult rows
│       ├── reports.fixture.ts             # Report payload generator (CWV mobile+desktop, keywords)
│       ├── api-keys.fixture.ts            # 6 API keys + UsageDaily
│       ├── refresh-tokens.fixture.ts      # 4 refresh tokens (active/expired/revoked)
│       ├── scheduled-audits.fixture.ts    # 4 scheduled + 4 alerts
│       └── share-links.fixture.ts         # 10 share links (active/popular/revoked)
│
├── apps/gateway/prisma/seed-demo.ts       # User, RefreshToken, Audit, PageAudit, ScheduledAudit, AuditAlert, ApiKey, UsageDaily
├── apps/seo-analyzer/prisma/seed-demo.ts  # RuleResult (depends on existing 22 SeoRule from seed.ts)
└── apps/report/prisma/seed-demo.ts        # Report, ReportKeyword, ReportCwv, ShareLink
```

## 4. Tooling

- **Runner:** `tsx` (added to root devDeps). Lý do: `ts-node` của từng app có `rootDir: ./src` chặt → import file ở `scripts/demo-fixtures/` (ngoài `src/`) báo lỗi `TS6059`. `tsx` không strict về rootDir, transpile-only, dev experience tốt nhất.
- **Cross-DB orchestration:** Mỗi app có script `npm run prisma:seed:demo` riêng. Root orchestrator dùng `child_process.execSync` để spawn 3 lệnh tuần tự (gateway → analyzer → report), inherit stdio.

## 5. Cross-DB ID Strategy

UUID **cố định** dạng `99999999-aaaa-bbbb-cccc-DDDDDDDDDDDD` (12 hex cuối phân biệt entity) khai báo trong `scripts/demo-fixtures/ids.ts`:

```ts
export const DEMO_USER_IDS = {
  ALICE:  '99999999-1111-1111-1111-000000000001',
  BOB:    '99999999-1111-1111-1111-000000000002',
  ...
}
export const DEMO_AUDIT_IDS = {
  ALICE_001: '99999999-2222-2222-2222-000000000001',
  ...
}
```

Mỗi seed-demo.ts upsert theo `id` cố định → cross-DB references "tự khớp" mà không cần truyền runtime.

Lưu ý: `RuleResult.ruleId` schema là `VarChar(100)` không phải UUID — đây là **denormalized**, lưu `SeoRule.name` (vd `"title_tag"`) chứ không phải SeoRule.id. → Không phải lo vấn đề SeoRule.id random vì seed-demo dùng tên rule.

## 6. Coverage Matrix

### Users (8 demo + 2 existing system users không touch)

| Email | Role | isVerified | isLocked | OAuth | Pwd | Lý do |
|---|---|---|---|---|---|---|
| `alice@example.com` | user | ✅ | — | — | Demo@123 | Power user — 25 audits, hero account |
| `bob@example.com` | user | ✅ | — | — | Demo@123 | Regular user — 8 audits |
| `carol@example.com` | user | ✅ | — | — | Demo@123 | Casual user — 5 audits |
| `david@example.com` | user | ✅ | — | — | Demo@123 | Light user — 2 audits |
| `oauth.user@example.com` | user | ✅ | — | google | (null) | OAuth flow — 1 audit |
| `pending@example.com` | user | ❌ | — | — | Demo@123 | Pre-verification UI |
| `locked@example.com` | user | ✅ | ✅ | — | Demo@123 | Admin lock UI |
| `demo-admin@seo-analyst.com` | admin | ✅ | — | — | Demo@123 | Demo admin panel |

System users (`admin@seo-analyst.com`, `dev@seoanalyst.local`) do `seed.ts` + `seed-api-key.ts` tạo, **không touch**.

### Audits (42 rows)

Distribution theo user + AuditStatus + AuditMode + score classification:

| User | Total | completed | pending | crawling | analyzing | reporting | failed | site-mode |
|---|---|---|---|---|---|---|---|---|
| Alice | 25 | 15 | 1 | 1 | 1 | 1 | 2 | 4 (subset của 15) |
| Bob | 8 | 8 | — | — | — | — | — | — |
| Carol | 5 | 4 | — | — | — | — | 1 | 1 |
| David | 2 | 2 | — | — | — | — | — | — |
| OAuth user | 1 | 1 | — | — | — | — | — | — |
| Locked user | 1 | 1 | — | — | — | — | — | — |

→ **Mọi AuditStatus có ≥1 row**, mọi AuditMode có ≥1 row.

Score distribution của 31 completed audits — cover 4 classification (`excellent ≥90`, `good 70-89`, `fair 50-69`, `poor <50`):

- excellent (≥90): 4 rows (95, 93, 91, 90)
- good (70-89): 11 rows
- fair (50-69): 11 rows
- poor (<50): 5 rows

Time spread: từ 90 ngày trước → hôm nay (deterministic, không random Date.now). Alice có data spread đều để demo trend.

### PageAudits

5 site-mode audits × ~5 page each = ~25 rows. Mỗi page có score riêng và `issues` JSON snippet.

### ScheduledAudits + AuditAlerts

| Schedule | Cron | isActive | Owner | Mode | Alert history |
|---|---|---|---|---|---|
| Alice hourly daily monitor | `0 9 * * *` | ✅ | Alice | single | 1 score_drop alert |
| Bob weekly | `0 0 * * 1` | ✅ | Bob | single | — |
| Carol paused | `0 0 1 * *` | ❌ | Carol | single | — |
| Alice site monitor | `0 3 * * 0` | ✅ | Alice | site | 1 new_issues + 1 site_down |

→ Mọi AlertType cover.

### ApiKeys (6 keys)

| Owner | Name | Env | State |
|---|---|---|---|
| Alice | "Production Dashboard" | live | active |
| Alice | "Extension Test" | test | active |
| Bob | "Old Integration" | live | **revoked** (`revokedAt` set) |
| Carol | "Beta Trial" | live | **expired** (`expiresAt` < now) |
| David | "Personal" | live | active |
| OAuth user | "Notion Bot" | test | active |

→ Mọi `ApiKeyEnvironment` + lifecycle state cover.

### UsageDaily

Cho 4 active API key × 7 ngày × (requests, llmCalls, tokens, errors, cacheHits) → ~28 rows. Pattern có 1 ngày spike (demo abuse detection).

### RefreshTokens (4)

- 2 active (Alice 2 device — Chrome + Mobile)
- 1 expired (Bob, expiresAt 31 ngày trước)
- 1 revoked (Carol, isRevoked=true)

### RuleResults (analyzer DB)

Cho mỗi audit completed (31 rows) × 22 SeoRule = **682 rows**.

Distribution status pass/warn/fail theo overall score của audit:
- score ≥90: pass 19, warn 2, fail 1
- score 70-89: pass 14, warn 5, fail 3
- score 50-69: pass 9, warn 7, fail 6
- score <50: pass 5, warn 5, fail 12

Generator deterministic (seed RNG bằng auditId hash) → cùng audit luôn ra cùng RuleResults.

### Reports + ReportCwv + ReportKeyword + ShareLinks (report DB)

- **Report**: 31 rows (1 per completed audit). `analysisSnapshot` + `cwvSnapshot` là JSON snapshot tự generate từ rule-results + cwv fixture.
- **ReportCwv**: 31 rows. Mỗi row có mobile + desktop. Pattern CWV:
  - 10 rows "good" (LCP <2.5s, INP <200ms, CLS <0.1)
  - 15 rows "needs improvement"
  - 6 rows "poor" (LCP >4s, CLS >0.25)
- **ReportKeyword**: 31 reports × 6-8 keyword = ~200 rows. 1 keyword `isTarget=true` per report.
- **ShareLinks** (10 total):
  - 5 active never accessed
  - 3 active accessed 5-20 lần
  - 1 active accessed 150 lần (viral demo)
  - 1 revoked (`isActive=false`)

## 7. Run commands

```bash
# Root package.json scripts thêm vào:
"seed:demo":        "tsx scripts/seed-demo.ts",
"seed:demo:reset":  "tsx scripts/seed-demo.ts --reset",

# Per-app (gateway/seo-analyzer/report) package.json:
"prisma:seed:demo": "tsx prisma/seed-demo.ts"
```

Orchestrator flow:
1. Verify 3 DB URLs đều set, không trùng URL gateway DB (sanity check).
2. Nếu `--reset`: DELETE chỉ row có UUID prefix `99999999-` (an toàn, không động dữ liệu thật).
3. `execSync('npm run prisma:seed:demo --workspace=@seo/gateway')`
4. → `--workspace=@seo/seo-analyzer`
5. → `--workspace=@seo/report`
6. In summary table: row count theo bảng.

## 8. Idempotency & Safety

- Mọi insert qua `upsert(where: { id }, update: {...}, create: {...})` với UUID cố định.
- Reset chỉ xoá rows có `id LIKE '99999999-%'` → không động chạm dữ liệu user thật.
- Refuse to run nếu `NODE_ENV=production` trừ khi pass `--force` (phòng nhầm tay).
- Không seed Redis state — script này pure DB.

## 9. Testing strategy

- **Smoke test:** Sau `npm run seed:demo`, query đếm rows mỗi bảng so với expected counts trong design này.
- **Idempotency test:** Chạy `seed:demo` 2 lần liên tiếp, count không đổi sau lần 2.
- **UI dogfood:** Mở web (port 3001), login `alice@example.com / Demo@123` → audit list phải show 25 row, mix status. Login `demo-admin@…` → admin panel phải show user list + rule weights.
- **PDF export:** Pick 1 completed audit của Alice, gọi `GET /api/v1/audits/:id/export` → PDF render thành công.
- **Share link:** Visit `/shared/audits/<token-từ-share-link-viral>` không cần auth.

## 10. Maintenance

- Khi schema đổi (Prisma migration mới có cột bắt buộc): update fixture file tương ứng + chạy lại `seed:demo:reset`.
- Khi thêm enum mới (vd `AuditStatus.archived`): bổ sung row demo vào `audits.fixture.ts` + tăng count trong matrix.
- Fixtures pure data (không dùng faker random) → diff git rõ ràng, dễ review.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Chạy nhầm trên prod | `NODE_ENV` guard + UUID prefix scoping |
| Schema drift khiến seed fail | Type-checked qua tsx + Prisma generated client → compile-time error |
| Cross-DB UUID mismatch | Single source of truth `ids.ts`, không phép sinh UUID runtime trong seed-demo |
| Bcrypt cost=12 chậm | OK — chỉ 8 users, total ~5s acceptable |
| Demo data lẫn dữ liệu thật khi user upgrade DB | UUID prefix `99999999-` dễ filter / clean |

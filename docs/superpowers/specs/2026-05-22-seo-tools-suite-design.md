# SEO Tools Suite — Design Spec

**Date:** 2026-05-22
**Author:** brainstorming session
**Status:** Approved (pending implementation plan)
**Branch:** `feat/seo-tools-suite` (off `main`, separate worktree)

---

## 1. Goal & Scope

Add a public-facing suite of 5 SEO content/preview tools under `/tools/*` on the web app. Tools are usable by anonymous visitors at low quota (organic SEO funnel) and fully unlocked for paid plans (Pro/Business). Implementation reuses the existing gateway service — no new microservice, no Playwright.

### 1.1 In scope (5 tools)

1. **Google preview** (`/tools/google-preview`) — render SERP snippet (desktop + mobile).
2. **Social preview** (`/tools/social-preview`) — render Facebook / Twitter-X / LinkedIn cards from OG + Twitter meta.
3. **Schema preview** (`/tools/schema-preview`) — detect and validate JSON-LD against 6 common schema.org types.
4. **Sitemap + Robots validator** (`/tools/sitemap-validator`) — fetch and validate `robots.txt` + `sitemap.xml` (with 1-level sitemap-index recursion).
5. **Favicon checker** (`/tools/favicon-checker`) — detect favicon coverage across browser/iOS/Android/PWA paths.

**Input modes per tool** (see §4 for details):

| Tool | Manual / Paste | From URL |
|---|---|---|
| Google preview | ✅ manual fields | ✅ |
| Social preview | ✅ manual fields | ✅ |
| Schema preview | ✅ paste JSON-LD | ✅ |
| Sitemap validator | — | ✅ only |
| Favicon checker | — | ✅ only |

### 1.2 Explicitly out of scope (this milestone)

- Bulk export of audits / keywords (deferred).
- Alt-image AI suggestions (Group B — deferred).
- llms.txt generator (Group B — deferred).
- Open Graph image generator (Group B — deferred).
- Schema validation beyond the 6 supported types.
- Recursion deeper than 1 level for sitemap-index.

---

## 2. Tier Model

| Audience | Tools usage | Source |
|---|---|---|
| Anonymous (no login) | FE-only modes unlimited. BE-fetch modes: **3 requests/hour/IP**. | Redis IP bucket. |
| Free user (logged in) | FE-only unlimited. BE-fetch: **10/day** shared pool. | New quota dimension `tools_fetches_daily`. |
| Pro | Unlimited, soft cap **1000/day** (abuse guard). | `tools_fetches_daily = -1`. |
| Business | Unlimited, soft cap **1000/day**. | `tools_fetches_daily = -1`. |

- Quota pool is shared across all 5 tools (one counter).
- Anonymous and authenticated paths use different keys; neither double-counts.
- Quota is **decremented before fetch** (no refund on failure) — keeps logic simple, prevents exploit loops.
- Manual / paste modes never touch the quota.

---

## 3. Architecture Overview

### 3.1 Backend module — `apps/gateway/src/tools/`

```
apps/gateway/src/tools/
├── tools.module.ts
├── controllers/
│   ├── google-preview.controller.ts      → POST /api/v1/tools/google-preview
│   ├── social-preview.controller.ts      → POST /api/v1/tools/social-preview
│   ├── schema-preview.controller.ts      → POST /api/v1/tools/schema-preview
│   ├── sitemap-validator.controller.ts   → POST /api/v1/tools/sitemap-validator
│   └── favicon-checker.controller.ts     → POST /api/v1/tools/favicon-checker
├── services/
│   ├── lite-fetcher.service.ts           # SSRF-safe HTTP client
│   ├── tools-quota.service.ts            # check/increment tools_fetches_daily
│   ├── google-preview.service.ts
│   ├── social-preview.service.ts
│   ├── schema-preview.service.ts
│   ├── sitemap-validator.service.ts
│   └── favicon-checker.service.ts
├── domain/
│   ├── tool-mode.enum.ts                 # MANUAL | URL | PASTE
│   ├── ssrf-policy.ts                    # IP block ranges + checks
│   └── validators/                       # schema.org type validators
├── dto/
│   ├── *-request.dto.ts
│   └── *-response.dto.ts
└── (no guard subfolder — quota logic lives in services to allow cache short-circuit; see §3.3)
```

**Decorators introduced:**
- `@OptionalAuth()` — JWT verifies if present, but doesn't reject anonymous requests.

### 3.2 Frontend structure — `apps/web/src/app/tools/`

```
apps/web/src/app/tools/
├── page.tsx                              # index — hero + grid 5 cards
├── layout.tsx                            # shared layout (QuotaBanner in header)
├── google-preview/page.tsx
├── social-preview/page.tsx
├── schema-preview/page.tsx
├── sitemap-validator/page.tsx
└── favicon-checker/page.tsx

apps/web/src/features/tools/
├── components/
│   ├── tool-shell.tsx                    # common layout: input | result
│   ├── quota-banner.tsx                  # "Còn 7/10 lượt hôm nay" + upgrade CTA
│   ├── google-serp-card.tsx              # desktop+mobile toggle
│   ├── facebook-og-card.tsx
│   ├── twitter-card.tsx
│   ├── linkedin-og-card.tsx
│   ├── schema-tree.tsx
│   ├── robots-rules-table.tsx
│   ├── sitemap-url-table.tsx
│   └── favicon-grid.tsx
└── api/
    └── use-*.ts                          # TanStack Query hooks
```

Each tool page is a standalone route to maximize SEO landing value (per-tool keyword targeting, shareable URLs).

### 3.3 Request flow

Cache-aware boundary: the guard only handles things it can decide without knowing the URL (skip on manual/paste). Cache lookup and quota increment live in the service so a cache hit can short-circuit before charging the user.

```
[Browser FE] ──POST /api/v1/tools/<tool> { mode, payload }──┐
                                                            │
[Gateway controller]                                        ▼
   ├─ @OptionalAuth() — populates req.user if JWT valid (no rejection if absent)
   ├─ <Tool>Service.execute(payload):
   │    1. manual|paste → parse payload locally, return.
   │    2. url path:
   │       a. cache.get(`tools:fetch:<sha256(url)>`) → hit? parse + return (no quota charge)
   │       b. miss → ToolsQuotaService.checkAndIncrement(user|ip)
   │                 throws 429 if exceeded
   │       c. LiteFetcher.get(url) → cache.set(...) → parse → return
   └─ Response: { data, warnings[], meta: { quotaUsed, quotaLeft, cached } }
```

### 3.4 Dependencies to add

| Package | Purpose | Workspace |
|---|---|---|
| `undici` (Node 18+ built-in) | HTTP client with custom `connect()` for DNS rebinding guard | `apps/gateway` |
| `cheerio` | HTML parsing (already in `crawler`, add to gateway) | `apps/gateway` |
| `fast-xml-parser` | Sitemap XML parser | `apps/gateway` |
| `robots-parser` | robots.txt parser | `apps/gateway` |
| `ip-address` | private IP range checks (IPv4 + IPv6) | `apps/gateway` |
| `image-size` | Favicon dimension detection | `apps/gateway` |

No new FE dependencies — reuse `@repo/ui` (shadcn) primitives.

### 3.5 Caching

| Key | TTL | Purpose |
|---|---|---|
| `tools:fetch:<sha256(url)>` | 10 min | Raw HTTP response (HTML / XML / manifest JSON) at LiteFetcher level. Shared across tools that fetch the same URL. |
| `tools:fetch:favicon:<sha256(url)>` | 1 hour | Favicon binary + metadata (HEAD/partial GET result) |
| `tools:quota:user:<id>:<YYYY-MM-DD>` | 26 h | Per-user daily counter (covers timezone drift) |
| `tools:ratelimit:ip:<ip>:<YYYY-MM-DD-HH>` | 70 min | Anonymous hourly bucket |

**Cache placement:** raw fetch result is cached, not parsed output (parsing is cheap, and different tools parse the same URL differently).

**Cache hit → no quota decrement.** A user retrying the same URL within the 10-min TTL gets a free re-render. The anonymous IP rate-limit is also skipped on cache hit (rate-limit is a DOS guard, not a usage charge).

---

## 4. Per-Tool Specifications

### 4.1 Google preview

**Endpoint:** `POST /api/v1/tools/google-preview`

**Request:**
```ts
{
  mode: 'manual' | 'url';
  // manual mode
  url?: string;
  title?: string;
  description?: string;
  faviconUrl?: string;
  breadcrumb?: string[];
  // url mode
  fetchUrl?: string;
}
```

**Service logic:**
- `mode='manual'`: echo payload, compute warnings, no fetch.
- `mode='url'`: `LiteFetcher.get(fetchUrl)` → Cheerio extract:
  - `title` = `<title>` text trim.
  - `description` = `meta[name=description]` content; fallback `og:description`.
  - `faviconUrl` = `<link rel="icon"|"shortcut icon">` href (resolved absolute); fallback `/favicon.ico`.
  - `breadcrumb` = best-effort parse of `BreadcrumbList` JSON-LD.

**Response:**
```ts
{
  data: {
    url: string;
    title: string;
    description: string;
    faviconUrl: string;
    breadcrumb: string[];
    displayUrl: string;        // formatted breadcrumb URL like Google shows
  };
  warnings: Array<{ field: string; severity: 'info'|'warn'|'error'; message: string }>;
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}
```

**Warning rules:**
- `title.length` outside 30–60 → warn (with pixel-width approximation).
- `description.length` outside 70–160 → warn.
- `description` empty → error.
- `title` equals URL → warn (likely missing title).

**FE:** `GoogleSerpCard` with desktop/mobile toggle. Manual mode wires textareas to live preview.

---

### 4.2 Social preview

**Endpoint:** `POST /api/v1/tools/social-preview`

**Request:**
```ts
{
  mode: 'manual' | 'url';
  url?: string;
  // manual
  ogTitle?: string; ogDescription?: string; ogImage?: string; ogSiteName?: string; ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string; twitterDescription?: string; twitterImage?: string;
  // url
  fetchUrl?: string;
}
```

**Service logic:**
- `mode='url'`: fetch HTML → extract `meta[property^="og:"]` + `meta[name^="twitter:"]`.
- For `og:image`: HEAD probe → if `Content-Length` < 1MB, fetch + `image-size` to determine dimensions.

**Warning rules:**
- `og:image` missing → error (FB/LinkedIn won't render thumbnail).
- `og:image` aspect ratio ≠ 1.91:1 (recommended 1200×630) → warn.
- `og:title.length` > 60 → warn (LinkedIn truncates).
- `twitter:card` missing → info (defaults to `summary`).
- `twitter:image` missing but `og:image` present → info ("Twitter will fall back to og:image").

**FE:** stack of 3 components — `FacebookOgCard`, `TwitterCard`, `LinkedInOgCard` — visually accurate as of 2025.

---

### 4.3 Schema preview

**Endpoint:** `POST /api/v1/tools/schema-preview`

**Request:**
```ts
{
  mode: 'paste' | 'url';
  raw?: string;          // JSON-LD raw when mode='paste'
  fetchUrl?: string;
}
```

**Service logic:**
- `mode='paste'`: `JSON.parse(raw)` — handles single object, array, or `@graph` container.
- `mode='url'`: fetch HTML → Cheerio `script[type="application/ld+json"]` → parse each block.
- Walk all objects, collect `@type` values, group by type.

**Validators (6 supported types):**
- `Article` / `NewsArticle` / `BlogPosting`: required `headline`, `author`, `datePublished`, `image`.
- `Product`: required `name`, `image`, `offers` (with `price`, `priceCurrency`).
- `FAQPage`: required `mainEntity` array with `Question` / `acceptedAnswer`.
- `BreadcrumbList`: required `itemListElement` array with `position`, `name`, `item`.
- `Organization`: required `name`, `url`; recommended `logo`, `sameAs`.
- `LocalBusiness`: required `name`, `address`, `telephone`.

**Response:**
```ts
{
  data: {
    blocks: Array<{
      type: string;
      raw: object;
      validation: { errors: string[]; warnings: string[] };
    }>;
    summary: { totalBlocks: number; validBlocks: number; invalidBlocks: number };
  };
  warnings: Array<{ field: string; severity: 'info'|'warn'|'error'; message: string }>;
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}
```

**FE:** `SchemaTree` collapsible JSON viewer per block; per-block "Valid / N errors" badge. External CTA → Google Rich Results Test.

---

### 4.4 Sitemap + Robots validator

**Endpoint:** `POST /api/v1/tools/sitemap-validator`

**Request:**
```ts
{
  siteUrl: string;
  options?: { followSitemapIndex?: boolean };  // default true, recurse 1 level
}
```

**Service logic:**
1. Fetch `<siteUrl>/robots.txt` → `robots-parser` → list rules + sitemap directives.
2. Resolve sitemap URL: first `Sitemap:` directive from robots, fallback `<siteUrl>/sitemap.xml`.
3. Fetch sitemap → `fast-xml-parser`:
   - `<sitemapindex>` → list nested sitemaps. If `followSitemapIndex=true`, fetch nested (cap 10), 1 level only.
   - `<urlset>` → list `<url>` entries.
4. Validate per URL: scheme http/https, `<lastmod>` ISO 8601, `<changefreq>` in enum, `<priority>` 0.0–1.0.

**Hard caps:**
- Sitemap file ≤ 5MB (fail fast).
- URLs returned to FE ≤ 1000 (paginate client-side if needed).
- Nested sitemap-index ≤ 10 children.
- Recursion depth: 1 level only.

**Quota note:** one user request = one quota decrement, regardless of how many nested sitemaps are fetched server-side. This is the heaviest tool — we may revisit if abuse occurs.

**Response:**
```ts
{
  data: {
    robots: {
      url: string;
      exists: boolean;
      rules: Array<{ userAgent: string; allow: string[]; disallow: string[]; crawlDelay?: number }>;
      sitemaps: string[];
      syntaxErrors: string[];
    };
    sitemap: {
      url: string;
      type: 'index' | 'urlset' | 'empty';
      isIndex: boolean;
      nestedSitemaps?: Array<{ url: string; urlCount: number; errors: string[] }>;
      urls?: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: number; isValid: boolean; errors: string[] }>;
      totalUrls: number;
      displayedUrls: number;
      truncated: boolean;
    };
  };
  warnings: Array<{ field: string; severity: 'info'|'warn'|'error'; message: string }>;
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}
```

**FE:** two sections — Robots (rules table per user-agent) and Sitemap (URL table with search + pagination).

---

### 4.5 Favicon checker

**Endpoint:** `POST /api/v1/tools/favicon-checker`

**Request:**
```ts
{ url: string }
```

**Service logic:**
1. Fetch HTML via LiteFetcher.
2. Cheerio extract candidates:
   - `<link rel="icon">`, `<link rel="shortcut icon">`, `<link rel="apple-touch-icon">`, `<link rel="apple-touch-icon-precomposed">`, `<link rel="mask-icon">`.
   - `<link rel="manifest">` → fetch manifest.json (cap 2MB) → parse `icons` array.
   - Fallback `/favicon.ico` (HEAD probe).
3. For each candidate: HEAD request (fallback partial GET `Range: bytes=0-2047` if HEAD rejected). If `Content-Length` < 500KB, full GET + `image-size` for dimensions.

**Recommended sizes (coverage checklist):**
- 16×16, 32×32 (browser tab).
- 180×180 (apple-touch-icon iOS).
- 192×192, 512×512 (PWA / Android).
- `safari-pinned-tab` SVG (mask-icon).

**Response:**
```ts
{
  data: {
    icons: Array<{
      source: 'link' | 'manifest' | 'fallback';
      rel?: string;
      href: string;
      exists: boolean;
      status: number;
      format?: 'ico' | 'png' | 'svg' | 'jpg';
      size?: { width: number; height: number };
      fileSizeBytes?: number;
    }>;
    coverage: {
      hasBasic: boolean;       // 16 or 32
      hasAppleTouch: boolean;  // 180
      hasManifest: boolean;
      hasPwaSizes: boolean;    // 192 + 512
      hasMaskIcon: boolean;
    };
  };
  warnings: Array<{ field: string; severity: 'info'|'warn'|'error'; message: string }>;
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}
```

**FE:** `FaviconGrid` — one card per candidate with actual thumbnail, size, format. Coverage checklist below.

---

## 5. SSRF Policy (LiteFetcher)

Every `LiteFetcher.get(url)` runs through these gates:

1. **Parse URL** — reject non-http(s) protocols (`file:`, `gopher:`, `ftp:`, `data:`, `dict:`…).
2. **Port whitelist** — only `80, 443, 8080, 8443`. Reject all other ports (prevents probing internal services).
3. **DNS resolve** — resolve all A/AAAA records for the hostname.
4. **IP block list** — reject if any resolved IP matches:
   - IPv4: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `224.0.0.0/4`, `0.0.0.0/8`.
   - IPv6: `::1`, `fc00::/7`, `fe80::/10`, `ff00::/8`.
   - Special case (covered by `169.254.0.0/16`): AWS metadata `169.254.169.254`.
5. **DNS rebinding guard** — use undici with custom `connect()` that binds the socket to a pre-verified IP (not the hostname).
6. **Headers:**
   - User-Agent: `SEOAnalystsBot/1.0 (+https://<frontend-url>/tools/bot)`.
   - Do not forward `Authorization` or `Cookie` from the caller request.
7. **Limits:**
   - Timeout: 10s total per request.
   - Max redirects: 3. Each redirect re-runs steps 1–4.
   - Max response size: 5MB (HTML/XML/JSON); 2MB (image). Stream is aborted when exceeded.
8. **Errors** — throw `FetchError` with code `SSRF_BLOCKED` | `TIMEOUT` | `TOO_LARGE` | `INVALID_PROTOCOL` | `BAD_STATUS`.

**Client-facing error** (4xx, no internal info leak):
```json
{ "code": "TOOLS_FETCH_BLOCKED", "message": "Cannot fetch the requested URL." }
```

**Audit logging:**
- Structured log per call: `{ tool, mode, userId|anonIp, urlHost, statusMs, cached }`.
- Counter metric for `SSRF_BLOCKED` reasons.
- DB persistence (`ToolsAuditLog` table) deferred — start with Prometheus + structured log; add DB only if forensic needs arise.

---

## 6. Quota Integration

### 6.1 Shared package changes

`packages/shared/src/plans.ts`:

```diff
 export type QuotaDimension =
   | 'audits_monthly'
   | 'site_audit_max_pages'
   | 'scheduled_audits_max'
   | 'scheduled_audit_min_interval_min'
   | 'api_keys_max'
   | 'api_calls_daily'
   | 'ai_calls_monthly'
+  | 'tools_fetches_daily'
   | 'history_retention_days';

 export interface PlanDefinition {
   audits_monthly: number;
   site_audit_max_pages: number;
   scheduled_audits_max: number;
   scheduled_audit_min_interval_min: number;
   api_keys_max: number;
   api_calls_daily: number;
   ai_calls_monthly: number;
+  tools_fetches_daily: number;  // -1 = unlimited (soft cap 1000)
   history_retention_days: number;
   features: FeatureFlag[];
 }
```

Plan values:
- `free.tools_fetches_daily = 10`
- `pro.tools_fetches_daily = -1`  (soft cap 1000/day)
- `business.tools_fetches_daily = -1`  (soft cap 1000/day)

### 6.2 ToolsQuotaService.checkAndIncrement (called after cache miss)

```ts
checkAndIncrement(ctx):
  user = ctx.request.user

  if (!user):
    bucket = `tools:ratelimit:ip:${ip}:${YYYYMMDDHH}`
    count = INCR bucket; EXPIRE bucket 70min
    if (count > 3) throw 429 { code: 'TOOLS_ANON_RATE_LIMIT', message: 'Sign in for more requests' }
    return { used: count, limit: 3, scope: 'ip-hour' }

  plan = user.plan
  quota = PLAN_FEATURES[plan].tools_fetches_daily
  bucket = `tools:quota:user:${userId}:${YYYY-MM-DD}`
  count = INCR bucket; EXPIRE bucket 26h
  if (quota === -1):
    if (count > 1000) throw 429 { code: 'TOOLS_SOFT_CAP', message: 'Daily soft cap reached' }
    return { used: count, limit: 1000, scope: 'user-day', softCap: true }
  if (count > quota) throw 429 { code: 'TOOLS_QUOTA_EXCEEDED', message: 'Daily quota exceeded — upgrade plan' }
  return { used: count, limit: quota, scope: 'user-day' }
```

**Rules:**
- Counter is incremented **before** fetch starts (atomic INCR).
- Fetch failure → **no refund** (keeps logic simple, prevents retry-exploit loops).
- Cache hit → service returns the cached result **without calling `checkAndIncrement`** — so no quota charge.
- Manual / paste modes → service returns parsed payload immediately, no quota call.

---

## 7. Testing Strategy

### 7.1 Backend unit (Vitest @ gateway)

- `lite-fetcher.service.spec.ts` — one test per SSRF rule (private IP, IPv6, non-whitelisted port, redirect to private IP, oversize abort, timeout). Mock undici dispatcher.
- `tools-quota.service.spec.ts` — anonymous rate-limit, free user quota, pro soft cap, manual/paste skip.
- `google-preview.service.spec.ts` — HTML fixtures, warning rules.
- `social-preview.service.spec.ts` — OG + Twitter fixtures, image dimension warnings.
- `schema-preview.service.spec.ts` — fixtures for the 6 supported types, JSON syntax errors.
- `sitemap-validator.service.spec.ts` — urlset, sitemapindex, oversize, malformed XML, robots syntax.
- `favicon-checker.service.spec.ts` — link/manifest/fallback paths, manifest parse.

Fixtures live under `apps/gateway/test/fixtures/tools/`.

### 7.2 Backend integration (`test/integration/tools.e2e-spec.ts`)

- E2E per endpoint with MSW intercepting outbound fetch.
- Anonymous / free / pro paths.
- Quota exhaustion → 429.
- SSRF blocked → 4xx with `TOOLS_FETCH_BLOCKED`.

### 7.3 Frontend (Vitest + RTL)

- Each tool page: render form, submit manual → preview updates.
- Mock TanStack Query + MSW handlers.
- `QuotaBanner` shows count / hides when unlimited.

### 7.4 E2E smoke (Playwright)

- `tests/e2e/tools/<tool>.spec.ts` — one file per tool. Load page, fill input, expect preview render.
- MSW worker (no live BE).

### 7.5 Coverage targets

- ≥ 80% lines on backend service files.
- ≥ 70% lines on FE feature components.

---

## 8. Telemetry

- Prometheus counters:
  - `tools_requests_total{tool, mode, status, plan}`.
  - `tools_fetch_blocked_total{reason}`.
  - `tools_quota_exhausted_total{plan}`.
- Structured log per request (see §5).
- DB audit log deferred (introduce only if forensic need arises).

---

## 9. Implementation Phasing

To be finalized in the implementation plan (writing-plans skill). Rough sketch:

1. **Phase 1 — Foundation** (~1–2 days)
   - Add `tools_fetches_daily` to `@repo/shared`.
   - Scaffold `apps/gateway/src/tools/` with `LiteFetcherService` (full SSRF), `ToolsQuotaService`, `@OptionalAuth()` decorator.
   - Unit tests for fetcher + quota.

2. **Phase 2 — 5 tool services + endpoints** (~3–4 days)
   - Implement in order of complexity: Google → Social → Favicon → Schema → Sitemap.
   - Service + controller + DTO + warnings + tests per tool.

3. **Phase 3 — Frontend** (~3–4 days)
   - Index page `/tools`.
   - 5 child pages using shared `ToolShell` + `QuotaBanner`.
   - TanStack Query hooks.

4. **Phase 4 — Polish & ship** (~1–2 days)
   - E2E Playwright smoke tests.
   - SEO meta per tool page + sitemap.xml entries.
   - Bot docs page `/tools/bot`.
   - QA, code review, ship.

**Total estimate:** ~8–12 dev-days (single dev).

**PR strategy:** 1 PR per phase if phases stay small; if Phase 2 grows, split into one PR per tool for reviewability.

---

## 10. Worktree & Branch Strategy

Implementation runs in an isolated worktree off `main` (avoids blocking on the current `feat/subscriptions-vietqr-improve` branch and prevents merge friction):

```bash
git fetch origin main
git worktree add ../seo-analysts-tools origin/main -b feat/seo-tools-suite
cd ../seo-analysts-tools
```

Use the `superpowers:using-git-worktrees` skill when executing.

---

## 11. Risks & Open Questions

### Risks

| Risk | Mitigation |
|---|---|
| Some sites block bot User-Agent → fetch fails | Identifiable UA + docs page; accept partial failure; log domains that consistently fail. |
| Sitemap recursive abuse (zip-bomb XML) | Hard caps: 5MB file, 10 nested max, 1-level recursion. |
| Schema validation covers only 6 types → user complaints | Document MVP clearly with "Coming soon: <type>". Plan v2 expansion. |
| Anonymous IP rate-limit triggers false positives behind corporate NAT | 3/h is generous for trial; CTA to login increases limit. |
| `image-size` lib CVE history | Pin version, monitor advisories, graceful fallback if parse fails. |
| Favicon HEAD probe rejected by many CDNs | Fallback partial GET (`Range: bytes=0-2047`). |
| Multilingual labels (EN/VI) on tool pages | Reuse the existing FE i18n setup; final decision when scaffolding FE phase. |

### Open questions (to resolve during plan phase)

- Anonymous quota counter: fixed-hour bucket (proposed) vs sliding window. Fixed hour wins on simplicity.
- Should email-unverified users be treated as Free or blocked? Proposed: treat as Free (no extra friction).
- Tool index page CTAs: newsletter / lead capture? Out of scope this milestone.

---

## 12. Acceptance Criteria

Implementation is "done" when:

- [ ] All 5 tools have working endpoints + FE pages reachable at the documented routes.
- [ ] Anonymous, Free, Pro/Business tiers all behave per §2; quota exhaustion returns 429 with the documented codes.
- [ ] LiteFetcher passes all SSRF tests in §7.1 (no false negatives on the documented IP ranges).
- [ ] Each tool returns the documented response shape with at least one warning rule firing per fixture.
- [ ] Backend unit coverage ≥ 80% on `apps/gateway/src/tools/services/`.
- [ ] FE coverage ≥ 70% on `apps/web/src/features/tools/components/`.
- [ ] Playwright smoke passes for all 5 tool pages.
- [ ] `/tools/*` pages have unique `<title>` + `og:*` meta and are included in `sitemap.xml`.
- [ ] Branch `feat/seo-tools-suite` is rebased on `main` and clean for review.

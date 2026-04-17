# Workflow Avada SEO Suite — 3-Framework Adapted

> **Primary workflow for this project.** Adaptation of `WORKFLOW.md` (Superpowers + GSD + GStack) to the Avada SEO Suite monorepo.
> Read this BEFORE starting any non-trivial task.

## Stack thực tế của project

```
packages/
  assets/     → React 18 + Vite + Polaris v13 + Redux/Saga + i18n   (FE)
  functions/  → Koa.js + Firebase Functions (v1+v2) + Firestore + PubSub  (BE)
  scripttag/  → Preact storefront widget (bundle-size sensitive)
  copyright/  → Copyright widget
extensions/   → 24+ Shopify extensions (ui_extension, admin_link, flow_action, theme-app-extension)
```

**Layer convention**: `Handler → Controller → Service → Repository → Firestore` (BE) · `Page → Custom Hook → API Hook → Backend` (FE)

**CI/CD**: GitLab → `master` auto-deploy production. Tag format **`v1.78.X`** (patch increment), luôn `git fetch --tags` trước khi tag. Staging slots `staging-1` … `staging-6` trong `.gitlab-ci.yml`. Node **20.19** CI / **20.20** runtime. `PUPPETEER_SKIP_DOWNLOAD=true` đã set — **KHÔNG** thêm `npx puppeteer browsers install`.

## Framework availability (đã verify)

| Framework | Trạng thái | Skills chính |
|-----------|-----------|----------|
| **Superpowers** | Installed (plugin) | `brainstorming`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `writing-plans`, `executing-plans`, `receiving-code-review`, `subagent-driven-development`, `dispatching-parallel-agents`, `using-git-worktrees`, `finishing-a-development-branch` |
| **GSD** | Installed global | 60+ `gsd-*` commands (`gsd-discuss-phase`, `gsd-plan-phase`, `gsd-execute-phase`, `gsd-quick`, `gsd-fast`, `gsd-code-review`, `gsd-debug`, `gsd-autonomous`, …) |
| **GStack** | Installed global (`~/.claude/skills/gstack/`) | `office-hours`, `plan-ceo-review`, `plan-eng-review`, `plan-design-review`, `plan-devex-review`, `review`, `cso`, `qa`, `ship`, `land-and-deploy`, `canary`, `investigate`, `checkpoint`, `design-review`, `autoplan`, `document-release`, `retro` |

## 5 Phase × Framework ownership

```
THIET KE ──> CHIA NHO ──> CODE ──────────> KIEM DINH ─────> SHIP
 GStack       GSD          Superpowers       GStack            GStack
 office-hours gsd-discuss  test-driven-dev   review            ship
 plan-eng-*   gsd-plan     gsd-execute       cso               land-and-deploy
                                             qa                canary
```

**Phase owner quyết định HOW. Co-owner quyết định WHEN/ORDER.**
**Output phase N = input bắt buộc cho phase N+1. Conflict → phase sớm hơn thắng.**

## Size detection (auto)

| Tier | Khi nào | Cheat sheet |
|------|---------|-------------|
| **Small** | ≤2 files, bug fix/typo/config, không arch change, không research | `SP:TDD → SP:verify → /commit` |
| **Medium** | 3–7 files, 1 module, có edge cases, cần discuss nhẹ | `/office-hours → gsd-quick → SP:TDD → /review → /commit` |
| **Large** | >7 files hoặc >2 modules, arch/data model change, needs research, multi-step deps | Full 5 phases |

**Overlap → pick highest tier. Unsure → pick higher.**

## Domain skills map (Avada SEO Suite)

Vào phase CODE, Superpowers TDD chạy bên trong, và **load 1 domain skill** theo bản chất task:

| Task liên quan | Domain skill | Package/Location |
|----------------|--------------|------------------|
| Koa handlers, controllers, services, Firebase Functions v1/v2, PubSub publishers/subscribers, cron, cold start, async patterns, webhook | **`backend`** | `packages/functions` |
| Firestore queries, indexes, batch ops, pagination, TTL, aggregates, transactions | **`firestore`** | `packages/functions/src/repositories` |
| Shopify REST/GraphQL, metafields, bulk operations, webhooks, 429/rate limit | **`shopify-api`** | `packages/functions/src/services` |
| Polaris v13 pages, App Bridge, Redux/Saga, custom hooks, routing, loadables | **`shopify-admin`** | `packages/assets` |
| SEO features: meta tags, structured data, sitemap, audits, indexing, alt text, broken links | **`seo-domain`** | `packages/functions/src/services/{audit,seo,…}` |
| Preact storefront widgets, bundle-size, lazy load, scripttag | **`scripttag`** | `packages/scripttag` |
| Liquid templates, app blocks, app embed, app proxy, theme app extension | **`theme-extension`** | `extensions/theme-app-extension` |
| Storefront data delivery: metafield vs proxy, Liquid data | **`storefront-data`** | `extensions/` + proxy routes |
| Figma → React/Polaris conversion, design tokens, component mapping | **`figma-to-code`** | `packages/assets` |
| PlantUML diagrams, sequence/flow/activity charts | **`code-visualization`** | `.claude/diagrams/` |
| AI auto-test / regression / smoke test với agent-browser | **`agent-test`** | generated tests |

**Rule**: 1 task = **1 primary domain skill** + **1 methodology skill** (`superpowers:test-driven-development`). Multi-domain task → load nhiều skill nhưng chọn 1 làm primary.

## Project security rules (apply everywhere — từ `CLAUDE.md` root)

- **No `console.log`** trong production code — **blocking** trong KIEM DINH
- **Ownership check** trước mọi mutation: `if (resource.shopID !== shopID) ctx.throw(403)`
- **No hardcoded credentials** — env vars / `.runtimeconfig.json` only
- **No staging URLs** committed
- **`target="_blank"`** luôn kèm `rel="noopener noreferrer"`
- **Pub/Sub payloads < 10MB** — large data → lưu Firestore, pass `docId` only
- **No secrets** trong code, không commit `.env*`, `serviceAccount*.json`, `*.pem`, `*.key`, `.runtimeconfig.json`
- **Mọi API endpoint** phải có `validateAccessToken` middleware
- **Default DENY** firestore.rules, allowlist specific collections
- **No `eval()`, no `dangerouslySetInnerHTML`** với user content chưa sanitize
- **Rate limit** mọi public endpoint (`firebase-functions-rate-limiter`)

Các rule này phải check trong phase KIEM DINH (`cso` + `review` + agent `code-reviewer`).

## Specialized agents (Avada SEO Suite)

Project này có **5 project-level agents** trong `.claude/agents/`:

| Agent | Use case | Phase chính |
|-------|----------|-------------|
| `code-reviewer` | Avada SEO patterns + security + project conventions | KIEM DINH |
| `debugger` | Firebase Functions, Firestore, PubSub, React FE, Shopify integration | CODE (fix loop) |
| `db-reader` | Read-only Firestore investigation | Discover / THIET KE |
| `data-scientist` | Firestore data analysis, app metrics, SEO performance | Discover / THIET KE |
| `prompt-optimizer` | Optimize/standardize prompts cho Claude Code | Support |

**Không có** `backend-dev`, `frontend-dev`, `test-writer`, `security-reviewer`, `perf-reviewer` như Avada Blog — thay bằng **domain skills** (backend, shopify-admin, shopify-api, seo-domain) và GStack `cso` (security) / GSD `gsd-code-review` (full review).

## Context Store integration (Avada-specific)

Trước khi vào CODE, **match file đang edit hoặc keyword trong prompt** với bảng lookup trong `.claude/CLAUDE.md` → đọc context file TRƯỚC KHI code:

- CRUD backend → `context-store/pattern/ctx-pattern-001-backend-crud.md`
- Frontend data hooks → `ctx-pattern-002-frontend-data.md`
- PubSub/cron → `ctx-pattern-003-pubsub.md`
- Page component/Polaris → `ctx-pattern-004-page-component.md`
- Shopify API/bulk → `ctx-pattern-005-shopify-api.md`
- Image pipeline → `ctx-pattern-006-image-pipeline.md`
- Theme extension → `ctx-pattern-007-theme-extension.md`
- AI agent/LangGraph → `ctx-pattern-008-ai-agent.md`
- Response/error format → `ctx-convention-002-response-format.md`
- Middleware/security → `ctx-architecture-002-middleware-chain.md`
- Audit system → `ctx-architecture-003-audit-system.md`
- Bulk edit dual-write → `ctx-architecture-004-bulk-edit-dual-write.md`
- Promotion/billing → `ctx-integration-002-promotion-code.md`
- AI credits/trial → `ctx-bugfix-001-trial-ai-credits-bypass.md`

Full lookup table: xem `.claude/CLAUDE.md` section "Context Store Quick Lookup".

Sau khi apply 1 context → tăng `reuse_count` trong file đó.

---

## Step-by-step per tier

### SMALL — bug fix / typo / config

```
1. Match context-store lookup → đọc file liên quan (nếu có)
2. superpowers:test-driven-development
   - Write failing test (Jest)
   - Implement fix
   - Run test → GREEN
3. superpowers:verification-before-completion
   - Full test suite pass cho package liên quan
   - ESLint clean
4. /commit
```

Skip THIET KE, CHIA NHO, SHIP. KIEM DINH dùng SP:verify thay vì GStack (overhead không đáng cho ≤2 files).

**Luôn load** 1 domain skill (backend / firestore / shopify-admin / …).

### MEDIUM — single module feature

```
1. THIET KE:
   Skill: office-hours            (GStack — 6 forcing questions)
   → What exactly, for whom, edge cases, constraints, narrowest wedge

2. CHIA NHO:
   gsd-quick --discuss            (hoặc gsd-discuss-phase nhẹ)
   → Break thành 2–4 atomic tasks + CONTEXT.md

3. CODE (per task):
   - Match context-store → đọc liên quan
   - Load domain skill (backend / firestore / shopify-admin / seo-domain / …)
   - Run superpowers:test-driven-development
     RED → GREEN → REFACTOR → atomic commit
   - Fix loop: dùng agent `debugger` nếu cần

4. KIEM DINH:
   Skill: review                  (GStack staff-level review, auto-fix obvious)
   Agent: code-reviewer           (Avada SEO patterns + security blockers)
   Check: project security rules  (no console.log, ownership, rate limit)
   → Fail? Loop back to CODE. Max 2 retries.

5. /commit (hoặc /done nếu có insight đáng lưu)
```

Skip SHIP (push thẳng feature branch, không tạo PR riêng ở medium).

### LARGE — multi-module / arch change

```
1. THIET KE:
   Skill: office-hours            (mandatory)
   Skill: plan-ceo-review         (optional — strategic scope)
   Skill: plan-eng-review         (mandatory — arch lock-in, data schema, APIs)
   Optional agent: db-reader / data-scientist (Firestore intel)
   → Output: architecture notes, data flow diagram (code-visualization skill)

2. CHIA NHO:
   gsd-discuss-phase N            (capture gray areas → CONTEXT.md)
   gsd-plan-phase N               (research + atomic XML task plans, wave-based)
   → Output: .planning/<milestone>/<phase>/N-X-PLAN.md

3. CODE:
   gsd-execute-phase N            (GSD orchestrates waves, fresh context per task)
   Inside each task:
     - Load context-store lookup + domain skill
     - superpowers:test-driven-development (RED → GREEN → REFACTOR)
     - Atomic commits per task
   Fix loop: agent `debugger` cho Firebase/PubSub/Shopify bugs

4. KIEM DINH:
   Skill: review                  (code quality + diff review)
   Skill: cso                     (OWASP Top 10 + STRIDE + Shopify auth + AI prompt injection)
   Skill: qa                      (browser automation — test flows, responsive, auth'd pages)
   Agent: code-reviewer           (Avada SEO conventions)
   Optional: gsd-code-review      (full phase review + REVIEW.md)
   → Fail? Re-run ONLY failed checks. Max 2 retries.

5. SHIP:
   Skill: ship                    (sync master, run tests, bump VERSION, CHANGELOG, create PR)
   Skill: land-and-deploy         (merge, wait GitLab CI, verify staging/prod)
   Skill: canary                  (post-deploy monitoring via browse daemon)
   Manual: git fetch --tags && git tag v1.78.X && git push --tags
   Optional: /done → /save-context nếu có kiến thức tái sử dụng
```

## Failure handling

```
KIEM DINH fail → back to CODE → fix → re-run ONLY failed checks
Max 2 retries. Still fail → STOP, escalate to user với:
  - Remaining issues list
  - Options: continue fixing / skip / abandon
```

## Size escalation mid-task

```
Scope grows beyond current tier during CODE →
  → STOP → re-classify → restart from first skipped phase
  → Code đã viết được KEEP
```

## Cross-phase context passing

```
THIET KE (arch notes)       → CHIA NHO reads before planning
CHIA NHO (task plans)       → CODE reads before implementing
CODE (test results + ctx)   → KIEM DINH reads before reviewing
KIEM DINH (review results)  → SHIP reads before shipping

Conflict → earlier phase's locked decisions win.
```

## When in doubt

- Bug báo từ support → `gsd-debug` hoặc `/debug` command → classify tier → follow workflow
- Freeform "làm X" → `gsd-do` để auto-route → hoặc Claude classify tier
- Cảm giác "đơn giản" nhưng >3 file → vẫn bắt buộc **Medium**
- Task chạm tới production data/billing/security → escalate lên **Large** bất kể số file

## Cheat sheets

**Small:** `SP:TDD → SP:verify → /commit`

**Medium:** `/office-hours → gsd-quick --discuss → SP:TDD → /review → /commit`

**Large:** `/office-hours + /plan-eng-review → gsd-discuss + gsd-plan → gsd-execute (SP:TDD inside) → /review + /cso + /qa → /ship + /land-and-deploy + /canary`

## Xem thêm

- Workflow gốc (framework-agnostic): [WORKFLOW.md](WORKFLOW.md)
- Chi tiết tier: [WORKFLOW-SMALL.md](WORKFLOW-SMALL.md) · [WORKFLOW-MEDIUM.md](WORKFLOW-MEDIUM.md) · [WORKFLOW-LARGE.md](WORKFLOW-LARGE.md)
- Project rules: [/CLAUDE.md](../../CLAUDE.md) · [packages/assets/CLAUDE.md](../../packages/assets/CLAUDE.md) · [packages/functions/CLAUDE.md](../../packages/functions/CLAUDE.md)
- System brain: [.claude/CLAUDE.md](../CLAUDE.md)
- Context store lookup: [.claude/context-store/INDEX.md](../context-store/INDEX.md)
- Coding rules: [.claude/rules/coding-rules.md](../rules/coding-rules.md) · [.claude/rules/security-guardrails.md](../rules/security-guardrails.md)

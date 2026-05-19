---
name: fe-be-integration
description: Use when user asks to test FE↔BE integration with real gateway + real DB (L4 tests), verify the FE-BE contract actually holds beyond MSW mocks, wire docker-based integration tests for auth/sensitive/admin slugs, or catch bugs that FE-only tests (fe-test-harness) cannot see (cookie flags, rate limits, OAuth redirects, session expiry, refresh race). Triggers on keywords "FE BE integration", "real gateway test", "docker up test", "contract test FE BE", "hợp đồng FE BE", "test round trip", "integration playwright", "nightly e2e", "test auth thật", "real DB test". NOT for unit tests or FE-only tests (use `testing` or `fe-test-harness` skill).
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(npm *), Bash(npx *), Bash(docker *), Bash(git *)
---

# FE↔BE Integration Harness (L4)

Wire skill cho **Layer 4 integration tests**: Playwright + Chromium + Next dev thật + Gateway thật + Postgres thật + Redis thật. Catch bugs mà L1/L2/L3 không thấy vì đang mock gateway.

## Layer map (đặt skill trong ngữ cảnh)

| Layer | Stack | Skill quản |
|---|---|---|
| L1 — Unit/Hook | vitest + MSW node | `fe-test-harness` |
| L2 — Page RTL | vitest + RTL + MSW + mock router | `fe-test-harness` |
| L3 — Playwright FE mock | Chromium + Next dev + `page.route` mock | `fe-test-harness` |
| **L4 — FE↔BE integration** | **Chromium + Next dev + real gateway + real DB** | **`fe-be-integration`** ← SKILL NÀY |
| L5 — Full pipeline E2E | All 5 microservices + Redis + BullMQ | `npm run e2e:smoke` (backend domain) |

## When to Use

- Slug đụng auth (login, register, OAuth, session, password reset).
- Slug đụng admin boundary, role/permission enforcement.
- Slug đụng refresh token, cookie domain/HttpOnly, CORS.
- Slug đụng rate limit, retry, session expiry.
- Pre-release sanity check — verify FE-BE contract chưa drift.
- CI nightly — catch silent breakage giữa dev windows.

**Không dùng khi:**
- Slug chỉ render static page, copy tweak, style → dùng `fe-test-harness` L3 là đủ.
- Muốn viết unit test cho 1 hook → dùng `testing` skill.
- Backend pipeline test (crawl → analyze → report) → dùng `npm run e2e:smoke`.

## Quick Reference — Workflow 9 bước

| # | Bước | Gate |
|---|---|---|
| 1 | Preflight: `docker ps` verify postgres + redis + gateway healthy; `curl http://localhost:3000/api/v1/health` trả 200 | Block nếu BE chưa up |
| 2 | Tạo `apps/web/tests/integration/` folder + README (ghi rõ "requires docker:up") | — |
| 3 | Seed script `tests/integration/fixtures/seed-users.ts` — Prisma tạo test users với password hash đã biết | ≥ 2 users: regular + admin |
| 4 | Cleanup script `tests/integration/fixtures/cleanup.ts` — TRUNCATE test data + reset Redis keys | Idempotent |
| 5 | Playwright config variant `playwright.integration.config.ts` — `fullyParallel: false`, timeout 30s, retries 1 | Serial mode để tránh DB race |
| 6 | Viết ≥ 1 round-trip test/critical flow (login, register, logout, session-expiry, OAuth, password-reset) | Mỗi flow 1 spec file |
| 7 | Real-gateway assertions: verify cookie HttpOnly + path + domain, rate-limit 429, CORS headers | Phải có ≥ 1 assertion kiểm hợp đồng wire-level |
| 8 | Add npm script `test:integration` + `PLAYWRIGHT_INTEGRATION=true` guard | Không chạy mặc định với `npm test` |
| 9 | Commit atomic: `test(web): wire FE↔BE integration harness (real gateway + real DB)` + CI workflow snippet | 1 commit duy nhất |

## Inputs skill sẽ hỏi

**Câu 1 — Critical flows nào cần cover?**
Default: login, register, logout, session-expiry, OAuth-callback, password-reset. User confirm hoặc cắt/thêm.

**Câu 2 — Seed strategy?**
Options:
- **a)** Prisma seed + TRUNCATE trước mỗi suite (simple, slow ~3s overhead)
- **b)** Transaction rollback per test (fast, phức tạp Prisma setup)
- **c)** Ephemeral DB per suite (slowest, cleanest)

Default: **(a)** — phù hợp đồ án, 3s overhead chấp nhận được.

**Câu 3 — CI schedule?**
- **a)** Nightly 2am UTC (recommended cho integration)
- **b)** Every PR (slow, expensive)
- **c)** Manual trigger only

Default: **(a)**.

## Anti-patterns skill chặn

- ❌ Mix L3 mock tests với L4 integration tests trong cùng folder → **phải tách** `tests/integration/`.
- ❌ Chạy integration với `fullyParallel: true` → DB race → flaky.
- ❌ Không cleanup sau suite → test 2 thấy dữ liệu test 1 → false pass.
- ❌ Hard-code credential trong code → dùng env var hoặc fixture seed.
- ❌ Integration suite chạy mặc định với `npm test` → dev loop slow 30s+ mỗi lần → opt-in.
- ❌ Assert chỉ URL changed mà không check cookie shape / token shape → miss wire-level bug.
- ❌ Seed 100 users trong fixture → overkill, 2-3 users đủ cho integration suite.
- ❌ Test Google OAuth thật với real Google API → flaky + cost; dùng Google's test account hoặc stub OAuth redirect.

## Recipes (copy-paste)

- **[recipes/seed-fixtures.md](recipes/seed-fixtures.md)** — Prisma seed users + cleanup script + run order
- **[recipes/playwright-integration-config.md](recipes/playwright-integration-config.md)** — config variant với serial + longer timeout
- **[recipes/real-gateway-assertions.md](recipes/real-gateway-assertions.md)** — cookie/token/rate-limit/CORS patterns
- **[recipes/ci-integration.md](recipes/ci-integration.md)** — GitHub Actions nightly schedule
- **[checklist.md](checklist.md)** — DoD

## Output schema

Skill xong deliver **đồng thời**:

1. **Folder mới** `apps/web/tests/integration/`:
   - `README.md` — "requires docker:up, see fe-be-integration skill"
   - `fixtures/seed-users.ts`
   - `fixtures/cleanup.ts`
   - `helpers/` — nếu cần reuse giữa specs

2. **Config mới** `apps/web/playwright.integration.config.ts`.

3. **Test files** `apps/web/tests/integration/*.spec.ts`:
   - `auth-login.spec.ts` (real round-trip)
   - `auth-session-expiry.spec.ts` (refresh flow)
   - `auth-cookie-contract.spec.ts` (HttpOnly + path)
   - + các flow user chọn ở Câu 1

4. **package.json scripts**:
   ```json
   {
     "scripts": {
       "test:integration": "PLAYWRIGHT_INTEGRATION=true playwright test --config=playwright.integration.config.ts",
       "test:integration:headed": "PLAYWRIGHT_INTEGRATION=true playwright test --config=playwright.integration.config.ts --headed"
     }
   }
   ```

5. **CI workflow** `.github/workflows/integration.yml` (nếu chưa có) với cron nightly.

6. **Commit atomic**:
   ```
   test(web): wire FE↔BE integration harness (real gateway + real DB)

   L4 integration layer — catches contract bugs that L1/L2/L3 miss
   because those layers mock the gateway via MSW/page.route.

   Added:
   - tests/integration/ folder (requires docker:up)
   - fixtures/seed-users.ts + cleanup.ts (Prisma-based)
   - playwright.integration.config.ts (serial, timeout 30s)
   - N round-trip specs: <list>

   Scripts:
   - npm run test:integration (opt-in via PLAYWRIGHT_INTEGRATION=true)
   - CI: nightly schedule in .github/workflows/integration.yml

   Catches wire-level issues: cookie HttpOnly/path, session refresh
   race, rate-limit 429 handling, OAuth callback, CORS.
   ```

## Wire-level assertions (cái L3 không kiểm được)

| Gì | L3 mock | L4 real | Bug thật có thể detect |
|---|---|---|---|
| Response body shape | assert structure | assert structure | ❌ drift khi gateway đổi DTO |
| Cookie HttpOnly flag | ❌ không kiểm (mock route không set cookie thật) | ✅ `context.cookies()` | ❌ cookie rò ra JS → XSS |
| Cookie path scope | ❌ | ✅ | ❌ token gửi sang endpoint khác |
| Rate limit 429 | ❌ (không có real counter) | ✅ gọi 100x thấy 429 | ❌ FE không handle 429 |
| CORS preflight | ❌ | ✅ | ❌ prod fail mặc dù dev pass |
| Session 15min expiry | ❌ | ✅ (fake timer hoặc DB manipulation) | ❌ silent refresh broken |
| OAuth state param | ❌ | ✅ | ❌ CSRF lỗ hổng |
| Password hash algorithm | ❌ | ✅ login with real bcrypt | ❌ DB migrations đổi hash format |

## Discipline rules

1. **Opt-in only**: mặc định `npm test` không chạy integration. Dev gõ `test:integration` khi cần.
2. **Serial mode**: `fullyParallel: false` — DB race = flaky.
3. **Cleanup sau mỗi suite**: TRUNCATE hoặc rollback, tuyệt đối không để data leak.
4. **Docker-up required**: Preflight check, fail fast với message rõ "run `npm run docker:up` first".
5. **CI nightly, không per-PR**: per-PR chậm + tốn tiền; nightly đủ cover drift.
6. **Wire-level assertion bắt buộc**: Mỗi spec ≥ 1 assertion kiểm thứ chỉ real BE mới expose (cookie, rate-limit, CORS...).
7. **Không test Google OAuth real API**: dùng stub OAuth callback endpoint với fake `?token=...`.

## Ties với các skill khác

| Skill | Quan hệ |
|---|---|
| `fe-test-harness` | Bổ sung. L1-L3 vs L4 — song song, không overlap. |
| `testing` | Day-to-day test writing. Skill này là one-time wire. |
| `backend` | Integration test cover contract — nếu fail, backend có thể cần sửa. Route về `backend` skill để fix gateway. |
| `deployment` | CI workflow integration với GitHub Actions — nếu cần setup secrets/docker caching thì route về `deployment` skill. |
| `cso` | Wire-level security checks (cookie flags, CORS) trùng với CSO audit. Có thể chain: `fe-be-integration` → `/cso` pre-release. |

## Khi nào invoke skill này?

- `.planning/frontend/<slug>/MAPPING.md` ghi "touches auth / session / admin / rate-limit / OAuth"
- `PLAN.md` có wave "backend contract verification"
- Post-Phase 5: Gate 3c (xem `WORKFLOW-FRONTEND.md`)
- User gõ "test FE BE thật", "chạy integration", "hợp đồng FE BE"

---
name: fe-test-harness
description: Use when user asks to wire Next.js FE test harness (MSW + Playwright + RTL), pay down deferred test debt after a slug, scaffold test infra for future slugs, or set up hermetic unit/e2e testing for apps/web. Triggers on keywords "wire test harness", "MSW + Playwright", "trả nợ test FE", "harness debt", "setup FE tests", "msw handlers", "page.route mock", "RTL setup", "dọn test infra", "scaffold FE test layer". NOT for writing day-to-day tests (use `testing` skill) or backend tests.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(npm *), Bash(npx *), Bash(git *)
---

# FE Test Harness (MSW + Playwright + RTL)

Wire + pay-down skill for `apps/web/` test infrastructure. Mỗi lần một slug kết thúc với RTL/E2E tests bị defer, skill này bật để:

1. Scaffold MSW node setupServer + Playwright page.route recipe reusable.
2. Ship **regression tests cho bug đã fix trong slug** để harness tự validate.
3. Để slug tiếp theo chỉ cần `server.use(...)` mở rộng, không dựng lại.

**Đây là skill WIRE harness, không phải skill viết test hàng ngày.** Day-to-day dùng [`testing`](../testing/SKILL.md).

## When to Use

- Slug vừa ship nhưng `BUILD-LOG.md` có dòng "tests deferred" / "needs MSW" / "needs router mocks".
- Có bug fix trong slug (vd: commit `fix(web): ...`) cần regression test nhưng chưa có nơi để viết.
- `apps/web/tests/` chỉ có vitest + playwright stub, chưa có MSW/render helper.
- Chuẩn bị slug mới sẽ cần test auth-aware page → cần harness sẵn.

**Không dùng khi:**
- Viết test cho 1 component đơn lẻ → dùng `testing` skill.
- Backend service tests → dùng `testing` skill hoặc `backend` skill.
- Chỉ thêm 1 handler MSW → sửa trực tiếp `tests/msw/handlers.ts`.

## Quick Reference — Workflow 8 bước

| # | Bước | Gate |
|---|---|---|
| 1 | Preflight: verify vitest/playwright/RTL đã có; `npm ls msw`; install nếu thiếu | `msw` ở devDeps, không upgrade major khác |
| 2 | Tạo `tests/msw/{handlers,server}.ts` + fixtures exports | Seed theo endpoint scan được |
| 3 | Cập nhật `tests/setup.ts`: lifecycle + `onUnhandledRequest: 'error'` | Strict mode bắt buộc |
| 4 | Tạo `tests/helpers/render.tsx` (`renderWithProviders` + fresh QueryClient `retry:false`/`gcTime:0`) | Hermetic per-test |
| 5 | Tạo `tests/e2e/helpers/<slug>.ts` (loginViaForm-style) | Dùng regex tiếng Việt cho labels |
| 6 | Viết regression test ≥ 1/bug + RTL smoke cho page slug | Harness phải tự validate |
| 7 | Run gates | `tsc 0` + `eslint 0` + vitest xanh + playwright xanh |
| 8 | Commit atomic: `test(web): wire MSW + Playwright test harness (<slug> debt + reusable)` + append harness note vào slug's `BUILD-LOG.md` | 1 commit duy nhất |

## Inputs skill sẽ hỏi

Trước khi thực thi, skill hỏi 3 câu (theo thứ tự):

**Câu 1 — Slug nào đang trả nợ?**
Đọc `.planning/frontend/` → list slugs có `BUILD-LOG.md` ghi "tests deferred" hoặc "needs MSW". Nếu có nhiều, user chọn 1.

**Câu 2 — Endpoints nào cần seed handlers?**
Grep `api.post/get/put/patch/delete` + `useMutation`/`useQuery` trong `apps/web/src/` → đề xuất danh sách. Default seed các endpoint của slug hiện tại với 200 responses.

**Câu 3 — Bug fixes nào cần regression test?**
Đọc `BUILD-LOG.md` section "Deviations" + `git log --oneline --grep='^fix(web)'` trong slug → mỗi bug = 1 test case bắt buộc.

## Anti-patterns skill chặn

- ❌ Nhồi harness vào slug scaffolding → phải đứng riêng như 1 commit / slug debt-paying rõ ràng.
- ❌ MSW `onUnhandledRequest: 'warn'` → **phải** `'error'` để catch network leak.
- ❌ `page.route` fulfill mà không stub downstream route (vd: nếu test login → /dashboard, phải stub `/dashboard` khi slug kia chưa build).
- ❌ Commit harness KHÔNG kèm regression test → harness không tự validate.
- ❌ Dùng `router.push` thay vì `router.replace` trong guard tests khi back-button là concern.
- ❌ Share QueryClient giữa các test → dùng factory `makeTestQueryClient()` per-test.
- ❌ `retry: true` hoặc `gcTime > 0` → mutation fail sẽ retry / state leak sang test sau.

## Recipes (copy-paste sẵn sàng)

- **[recipes/msw-node.md](recipes/msw-node.md)** — `tests/msw/handlers.ts` + `server.ts` + fixtures pattern + extension per-slug
- **[recipes/setup-lifecycle.md](recipes/setup-lifecycle.md)** — `tests/setup.ts` với strict `onUnhandledRequest: 'error'`
- **[recipes/render-helpers.md](recipes/render-helpers.md)** — `renderWithProviders` với fresh QueryClient factory
- **[recipes/playwright.md](recipes/playwright.md)** — `page.route` mocking + Vietnamese copy helpers + webServer config
- **[checklist.md](checklist.md)** — DoD trước khi commit

## Output schema

Skill xong phải deliver **đồng thời**:

1. **Harness files** (6 file):
   - `apps/web/tests/msw/handlers.ts`
   - `apps/web/tests/msw/server.ts`
   - `apps/web/tests/setup.ts` (modify)
   - `apps/web/tests/helpers/render.tsx`
   - `apps/web/tests/e2e/helpers/<slug>.ts`
   - `apps/web/package.json` (add `msw` devDep)

2. **Regression tests** (≥ 1/bug):
   - `apps/web/tests/unit/mutations.test.tsx` hoặc phù hợp với slug
   - Mỗi bug từ `BUILD-LOG.md` Deviations → 1 test case ≥

3. **Smoke tests cho slug** (≥ N page):
   - `apps/web/tests/unit/<slug>/<page>.test.tsx` cho mỗi page chính
   - `apps/web/tests/e2e/<slug>.spec.ts` 1 happy-path + 1 validation

4. **Gates xanh**:
   ```
   tsc --noEmit         → 0 errors
   eslint .             → 0 errors, 0 warnings (apps/web)
   vitest run           → all green
   playwright test      → all green (chromium)
   ```

5. **Commit atomic** với message chuẩn:
   ```
   test(web): wire MSW + Playwright test harness (<slug> debt + reusable)

   Activate the test infra that <prev-slug> shipped configs for. This
   commit is harness-first: downstream slugs get a minimal-friction path
   to RTL + real-network-shape mocking.

   Installed: <deps>
   Added (harness): <files>
   Added (tests that exercise the harness): <files>
   Results: <N> vitest + <M> Playwright — all green. tsc 0, eslint 0.

   Harness note: MSW handlers.ts can be extended per-slug via
   server.use(...) or by adding to the default handlers list.
   ```

6. **BUILD-LOG append** tại `.planning/frontend/<slug>/BUILD-LOG.md`:
   Section mới "Harness debt paid" với link commit + summary.

## Precedent

Skill này đúc kết từ commit [`3862458`](https://github.com/MinhDucoder/DO_AN/commit/3862458) (Apr 2026) — "test(web): wire MSW + Playwright test harness (slug 2 debt + reusable)". Xem `git show 3862458 --stat` trong repo để tham khảo shape commit mẫu (10 files, +896/-3 LOC, 52 vitest + 9 playwright xanh).

## Ties với các skill khác

| Skill | Quan hệ |
|---|---|
| `testing` | Bổ sung, không thay thế. `testing` là day-to-day; `fe-test-harness` là one-time wire. |
| `frontend` | `frontend` skill tạo component/page. Skill này tạo infra để test chúng. |
| `code-reviewer` | Sau khi harness xong, trigger `code-reviewer` để verify regression tests đủ cover bug fixes. |
| `gsd:plan-phase` | Nếu slug mới cần harness sẵn, add wave "wire test harness" vào PLAN trước wave regression tests. |

## Discipline rules

1. **Harness-first, không rải**: 1 commit thuần wire. Không kèm feature code. Không refactor ngoài scope.
2. **Tự validate**: Không merge harness mà không có ≥ 1 regression test chạy qua harness thành công.
3. **Strict unhandled**: MSW `onUnhandledRequest: 'error'` — tuyệt đối không `'warn'`.
4. **Hermetic**: Fresh QueryClient + `cleanup()` + `server.resetHandlers()` + `clearAuth()` trong `afterEach`.
5. **Vietnamese copy match**: E2E helpers dùng regex Vietnamese (`/^Đăng nhập$/i`) — không hardcode English selector.
6. **Stub downstream**: Nếu test navigate đến page slug khác chưa build, `page.route` hoặc `vi.mock next/navigation` stub sẵn.

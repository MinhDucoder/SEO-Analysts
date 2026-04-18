# Definition of Done — Harness Commit

Mọi ô phải ✅ trước khi commit atomic `test(web): wire MSW + Playwright test harness (<slug> debt + reusable)`.

## 1. Deps

- [ ] `msw` ở `apps/web/package.json` devDependencies (version ≥ 2.x).
- [ ] Không upgrade/downgrade package nào khác ngoài `msw`.
- [ ] `package-lock.json` sync (`npm install` ran).

## 2. Harness files present

- [ ] `apps/web/tests/msw/handlers.ts` — seed endpoint handlers + export fixtures.
- [ ] `apps/web/tests/msw/server.ts` — `setupServer(...handlers)`.
- [ ] `apps/web/tests/setup.ts` — lifecycle với `onUnhandledRequest: 'error'`.
- [ ] `apps/web/tests/helpers/render.tsx` — `renderWithProviders` + fresh client factory.
- [ ] `apps/web/tests/e2e/helpers/<slug>.ts` — Vietnamese copy helpers.

## 3. Regression tests

- [ ] Mỗi bug từ `BUILD-LOG.md` Deviations section → ≥ 1 test case.
- [ ] Mỗi bug từ `git log --oneline --grep='^fix(web)' <slug-range>` → ≥ 1 test case.
- [ ] Tests fail nếu rollback bug fix (verify bằng cách checkout pre-fix commit — optional nhưng recommend).

## 4. Smoke tests

- [ ] RTL test cho mỗi page chính của slug (render + validation + success path).
- [ ] Playwright spec 1 happy-path qua `page.route` mock.
- [ ] Playwright HTML lang=vi assertion cho mọi page Vietnamese.

## 5. Quality gates

```bash
npx tsc --noEmit --project apps/web/tsconfig.json   # 0 errors
npx eslint apps/web                                  # 0 errors, 0 warnings
npx vitest run --root apps/web                       # all green, ≥ slug's test count
npx playwright test --config apps/web/playwright.config.ts   # all green
```

Mỗi dòng trên phải PASS trước khi commit.

## 6. Discipline

- [ ] MSW `onUnhandledRequest: 'error'` (không `'warn'`).
- [ ] Fresh QueryClient per test qua factory.
- [ ] Provider tree trong `TestProviders` = provider tree trong `app/providers.tsx`.
- [ ] Store reset trong `afterEach` cho mọi state-holding Zustand store (`clearAuth()`, ...).
- [ ] Vietnamese copy regex có anchor `^...$` khi cần disambiguate.
- [ ] Downstream page chưa build → stub `page.route` HTML fulfill.

## 7. Commit hygiene

- [ ] 1 commit duy nhất (harness + regression tests + smoke).
- [ ] Không kèm feature code, không refactor ngoài scope.
- [ ] Message format:
  ```
  test(web): wire MSW + Playwright test harness (<slug> debt + reusable)

  Activate the test infra that <prev-slug> shipped configs for. This
  commit is harness-first: downstream slugs get a minimal-friction path
  to RTL + real-network-shape mocking.

  Installed: msw@<version>
  Added (harness):
  - tests/msw/handlers.ts
  - tests/msw/server.ts
  - tests/setup.ts (modify)
  - tests/helpers/render.tsx
  - tests/e2e/helpers/<slug>.ts

  Added (tests that exercise the harness):
  - tests/unit/<file>.test.tsx (<N> cases, covering bugs <commits>)
  - tests/unit/<slug>/<page>.test.tsx (<M> cases RTL + user-event)
  - tests/e2e/<slug>.spec.ts (<K> Playwright cases)

  Results: <vitest-count> vitest + <playwright-count> Playwright
  (incl. existing tests) — all green. tsc 0, eslint 0.

  Harness note: MSW handlers.ts can be extended per-slug via
  server.use(...) or by adding to the default handlers list.
  ```

## 8. Planning artifacts update

- [ ] `.planning/frontend/<slug>/BUILD-LOG.md` — append section "Harness debt paid":
  ```markdown
  ## Harness debt paid (follow-up to slug)

  | Item | Commit | Status |
  |---|---|---|
  | MSW + Playwright + RTL wire | <commit-sha> | ✅ |
  | Regression tests for <N> bugs | <commit-sha> | ✅ |
  | Smoke tests for <M> pages | <commit-sha> | ✅ |

  Harness reusable by next slug via `server.use(...)` override or
  appending to default handlers in `tests/msw/handlers.ts`.
  ```

- [ ] (Optional) `.planning/frontend/<slug>/STATE.md` — update status `passing → complete-with-tests`.
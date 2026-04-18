# Definition of Done — Integration Harness

Mọi ô phải ✅ trước khi commit atomic `test(web): wire FE↔BE integration harness (real gateway + real DB)`.

## 1. Preflight

- [ ] `npm run docker:up` chạy stack lên xanh: gateway + postgres + redis healthy.
- [ ] `curl http://localhost:3000/api/v1/health` trả 200.
- [ ] `npx prisma migrate status` ở gateway trả "Database schema is up to date".

## 2. Folder structure

- [ ] `apps/web/tests/integration/` tồn tại, có `README.md` ghi rõ "requires docker:up".
- [ ] `apps/web/tests/integration/fixtures/seed-users.ts` — Prisma seed + TEST_USERS export.
- [ ] `apps/web/tests/integration/fixtures/cleanup.ts` — TRUNCATE + Redis flush.
- [ ] `apps/web/tests/integration/fixtures/preflight.ts` — docker + gateway health check.

## 3. Config

- [ ] `apps/web/playwright.integration.config.ts` tồn tại.
- [ ] `fullyParallel: false`, `workers: 1`, `timeout: 30_000`.
- [ ] `globalSetup` + `globalTeardown` reference seed/cleanup.
- [ ] `PLAYWRIGHT_INTEGRATION=true` guard trong globalSetup (throw nếu thiếu).
- [ ] `trace: "retain-on-failure"` + video + screenshot on failure.

## 4. Specs — critical flows

Ít nhất ≥ 3 spec files, mỗi file ≥ 1 wire-level assertion:

- [ ] `auth-login.spec.ts` — login round-trip + cookie HttpOnly assertion.
- [ ] `auth-session-expiry.spec.ts` — silent refresh flow.
- [ ] `auth-cookie-contract.spec.ts` — refresh token path/domain/sameSite.
- [ ] (Nếu có) `auth-rate-limit.spec.ts` — 429 after N failed logins.
- [ ] (Nếu có) `auth-cors.spec.ts` — preflight response headers.
- [ ] (Nếu có) `auth-oauth.spec.ts` — state param validation.

## 5. npm scripts

- [ ] `apps/web/package.json` có:
  - `test:integration`
  - `test:integration:headed`
  - `test:integration:debug`
- [ ] Cả 3 script prefix `PLAYWRIGHT_INTEGRATION=true`.

## 6. CI

- [ ] `.github/workflows/integration.yml` exists.
- [ ] Cron schedule set (recommend `0 18 * * *` UTC = 2am VN).
- [ ] `workflow_dispatch` enabled cho manual.
- [ ] Services postgres + redis khai báo với health check.
- [ ] Gateway start → health loop → test run.
- [ ] Upload report artifact on failure.

## 7. Wire-level assertions (bắt buộc ≥ 1/spec)

Mỗi spec phải có assertion kiểm thứ L3 mock KHÔNG thấy:

- [ ] Cookie HttpOnly + path + sameSite
- [ ] HTTP header (CORS, rate-limit counter, X-Request-ID...)
- [ ] Status code sequence (401 → 401 → ... → 429)
- [ ] Session refresh round-trip
- [ ] OAuth state/nonce validation

## 8. Quality gates

```bash
# Manual run trước commit:
npm run docker:up
npm run test:integration         # all green

# Type + lint
npx tsc --noEmit --project apps/web/tsconfig.json   # 0 errors
npx eslint apps/web/tests/integration                # 0 errors
```

Tất cả phải PASS.

## 9. Discipline

- [ ] `npm test` default KHÔNG chạy integration (guard `PLAYWRIGHT_INTEGRATION=true`).
- [ ] Cleanup idempotent — chạy 2 lần liên tiếp không lỗi.
- [ ] FK order đúng (RefreshToken trước User).
- [ ] Redis keys flushed theo pattern — không fullFLUSHDB.
- [ ] Không leak credentials vào error message nếu test fail.
- [ ] Cookie assertions dùng `.toMatch(/^(Lax|Strict)$/)` thay vì hardcode — gateway có thể đổi policy.

## 10. Commit hygiene

- [ ] 1 commit duy nhất.
- [ ] Không kèm feature code hoặc refactor ngoài scope.
- [ ] Message format:
  ```
  test(web): wire FE↔BE integration harness (real gateway + real DB)

  L4 integration layer — catches contract bugs that L1/L2/L3 miss
  because those layers mock the gateway via MSW/page.route.

  Added:
  - tests/integration/ folder (requires docker:up)
  - fixtures/seed-users.ts + cleanup.ts (Prisma-based, <N> test users)
  - playwright.integration.config.ts (serial, timeout 30s, 1 worker)
  - <N> round-trip specs: <list>
  - .github/workflows/integration.yml (nightly 2am UTC+7)

  Scripts:
  - npm run test:integration (opt-in via PLAYWRIGHT_INTEGRATION=true)
  - CI: nightly + workflow_dispatch

  Catches wire-level issues that L3 cannot: cookie HttpOnly/path,
  session refresh, rate-limit 429, CORS preflight, OAuth state param.
  ```

## 11. Documentation

- [ ] `apps/web/tests/integration/README.md` ghi:
  - Prerequisites: `npm run docker:up`
  - Run command: `npm run test:integration`
  - Debug: `npm run test:integration:debug`
  - Troubleshooting: gateway not healthy → check docker logs
  - CI: link tới integration.yml workflow

- [ ] (Optional) `.planning/frontend/<slug>/BUILD-LOG.md` append "L4 integration wired" section với commit SHA.
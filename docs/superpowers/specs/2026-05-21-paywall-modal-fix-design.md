# Paywall / Upgrade Modal Fix — Design

**Date:** 2026-05-21
**Branch:** `feat/subscriptions-vietqr-improve`
**Scope:** MEDIUM (cross 2 apps: `gateway` + `web`), no proto / no schema change.

## Problem

Khi user free chạm feature trả phí hoặc hết quota, modal "Nâng cấp" **không hiện**. Thay
vào đó user thấy modal "Too many requests" sai + một toast thô tiếng Anh
(`Request failed with status code 429 ... POST http://localhost:3000/api/v1/audits`).

### Root causes (evidence)

1. **BE nuốt `code`.** `AllExceptionsFilter`
   (`apps/gateway/src/common/filters/all-exceptions.filter.ts:41-49`) reshape mọi
   `HttpException` thành RFC 7807 và chỉ giữ `message`/`error`, **vứt mất `code`** (và
   `resetAt`, `featureFlag`, `dimension`, `limit`). Backend ném
   `{ code: 'FEATURE_NOT_AVAILABLE' | 'QUOTA_EXCEEDED', ... }`
   (`apps/gateway/src/billing/domain/billing.errors.ts`), nhưng client nhận body không có
   `code`.
2. **FE chỉ trigger modal khi có `code`.** `apps/web/src/lib/api/client.ts:78,86` check
   `body.code === 'QUOTA_EXCEEDED' | 'FEATURE_NOT_AVAILABLE'` → luôn `undefined` → modal
   không chạy.
3. **429 bị "cướp" bởi RateLimit modal.** `QuotaExceededError` ném HTTP 429
   (`billing.errors.ts:27`); FE `afterResponse` thấy 429 là mở luôn `rateLimit` modal
   (`client.ts:163-170`), không phân biệt quota-billing với rate-limit thật.
4. **Toast thô.** `apps/web/src/app/[locale]/(app)/audits/new/page.tsx:67-68` làm
   `toast.error(err.message)` → in message mặc định của ky, chồng lên modal.
5. **(nhỏ) Link sai locale.** `QuotaExceededDialog.tsx:3,24` dùng `next/link` trỏ
   `/billing/upgrade`; phần còn lại app dùng `Link` locale-aware từ `@/i18n/navigation`
   (`localePrefix: "as-needed"` → EN rớt prefix).
6. **(phụ) AI quota dùng code khác.** `public-check.service.ts:152` ném
   `AI_QUOTA_EXCEEDED` (FE chưa nhận diện).

## Decisions (user-confirmed)

- UX: **giữ luồng hiện tại** — chỉ làm modal "Nâng cấp" chạy đúng. KHÔNG proactive lock,
  KHÔNG redirect route.
- Fix contract: **BE giữ lại `code`** trong RFC 7807 (không đổi sang FE-only parsing).
- Dập toast thô: **chỉ trang new-audit** (helper tái dùng được sau).

## Changes

### Part 1 — BE: `AllExceptionsFilter` giữ `code` + extension members
`apps/gateway/src/common/filters/all-exceptions.filter.ts`
- Khi `exception.getResponse()` là object có `code` (string), copy `code` lên
  `ProblemDetails`.
- Copy thêm các field máy-đọc nếu có: `resetAt`, `featureFlag`, `currentPlan`,
  `dimension`, `limit`.
- Giữ nguyên `type/title/status/detail/instance/requestId`. RFC 7807 cho phép extension
  members nên contract không vỡ.

### Part 2 — FE: phân biệt 429 + nhận diện AI quota (`apps/web/src/lib/api/client.ts`)
- Nhánh `afterResponse` 429: clone body, đọc `code`. Nếu `QUOTA_EXCEEDED` /
  `AI_QUOTA_EXCEEDED` → **return sớm, KHÔNG mở** `rateLimit` modal (nhường cho
  `beforeError` mở quota dialog). Còn lại → mở `rateLimit` modal như cũ (giữ logic
  Retry-After).
- `beforeError`: thêm `AI_QUOTA_EXCEEDED` vào nhánh hiển thị quota dialog. `QUOTA_EXCEEDED`
  + `FEATURE_NOT_AVAILABLE` giờ chạy được vì `code` đã có (Part 1).

### Part 3 — FE: helper + dập toast thô
`apps/web/src/lib/api/errors.ts` (mới)
- `isHandledByModal(err): boolean` — true khi `err` là `HTTPError` với
  status ∈ {401,403,429} hoặc `code` ∈ {`QUOTA_EXCEEDED`,`FEATURE_NOT_AVAILABLE`,
  `AI_QUOTA_EXCEEDED`,`ACCOUNT_LOCKED`}. (Đọc code async không tiện trong sync guard →
  guard chủ yếu theo status; chi tiết impl xử lý ở plan.)
- `getFriendlyMessage(err, fallback): string` — lấy `detail` từ problem+json, bỏ prefix
  `CODE:` nếu có; fallback chuỗi truyền vào.

`apps/web/src/app/[locale]/(app)/audits/new/page.tsx`
- `onError`: nếu `isHandledByModal(err)` → bỏ toast (modal đã lo); else
  `toast.error(getFriendlyMessage(err, "..."))`.

### Part 4 — FE: `QuotaExceededDialog.tsx` dùng `Link` locale-aware
- Đổi `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"`.

## Tests (TDD)

**BE** (`apps/gateway` vitest/jest):
- Filter: exception có `code` → output có `code` + extension fields, status giữ nguyên.
- Filter: exception không có `code` (vd `BadRequestException('x')`) → output RFC 7807 như cũ
  (regression).

**FE** (nếu harness có sẵn — MSW/RTL):
- 429 + body `{code:'QUOTA_EXCEEDED'}` → `useQuotaDialog` mở, `useGlobalModalStore` KHÔNG
  mở rateLimit.
- 429 không code (rate-limit thật, có Retry-After) → rateLimit modal mở.
- 403 + `{code:'FEATURE_NOT_AVAILABLE'}` → quota dialog (variant feature) mở.

## Out of scope

- Proactive feature lock (badge/disable theo `useSubscription().features`).
- Redirect route trả phí sang /pricing.
- Dập toast cho các page khác ngoài new-audit.
- Đổi status code của `QuotaExceededError` (giữ 429).

## Files touched

1. `apps/gateway/src/common/filters/all-exceptions.filter.ts` (+ test)
2. `apps/web/src/lib/api/client.ts`
3. `apps/web/src/lib/api/errors.ts` (mới)
4. `apps/web/src/app/[locale]/(app)/audits/new/page.tsx`
5. `apps/web/src/components/billing/QuotaExceededDialog.tsx`

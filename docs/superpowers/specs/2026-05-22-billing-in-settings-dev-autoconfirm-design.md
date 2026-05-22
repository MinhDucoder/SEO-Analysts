# Billing in Settings + Dev Auto-Confirm Cron — Design

**Date:** 2026-05-22
**Branch:** `feat/subscriptions-vietqr-improve`
**Scope:** MEDIUM (cross 2 apps: `web` + `gateway`). No proto / no Prisma schema change.

## Problem / goals

1. **Billing nằm rời.** Trang `/billing` (gói hiện tại + lịch sử thanh toán) đứng riêng, UI thô (`green-100`/`white`), link nâng cấp còn trỏ `/billing/upgrade`. Muốn đưa nó **vào Settings** như một tab, đồng bộ với Hồ sơ/Mật khẩu.
2. **Demo phải fire webhook tay.** Local không có Casso → mỗi lần demo phải gọi webhook thủ công. Muốn **cron tự xác nhận** các chuyển khoản đang chờ (~1 phút) **chỉ ở local/dev**.

## Decisions (chốt qua brainstorm)

- Settings có **4 tab**: Hồ sơ · Mật khẩu · **API keys** · **Gói & Thanh toán** (gộp luôn api-keys cho đồng bộ).
- `/billing` (overview) → move vào **`/settings/billing`**. Checkout/upgrade giữ nguyên dưới `/billing/*`.
- Nút nâng cấp → **`/pricing`** (thay `/billing/upgrade`).
- Auto-confirm = **cron mỗi phút**, **double-guard**: `BILLING_DEV_AUTOCONFIRM=true` **VÀ** `NODE_ENV !== 'production'`. Tái dùng `reconciler.handleWebhook` (đi đúng path thật).

---

## Part 1 — Billing vào Settings (web)

### Routes & nav
- `lib/constants.ts`: thêm `ROUTES.settingsApiKeys = "/settings/api-keys"` và `ROUTES.settingsBilling = "/settings/billing"`.
- `components/settings/settings-shell.tsx`: `SettingsTab = "profile" | "password" | "api-keys" | "billing"`; mảng `tabs` thêm 2 entry (api-keys → `ROUTES.settingsApiKeys`, billing → `ROUTES.settingsBilling`), label qua `t(\`tabs.${key}\`)`.
- i18n `messages/{vi,en}.json` → `settings.tabs.apiKeys`, `settings.tabs.billing` (vi: "API keys", "Gói & Thanh toán"; en: "API keys", "Plan & Billing").

### Pages
- **Move** `app/[locale]/(app)/billing/page.tsx` → `app/[locale]/(app)/settings/billing/page.tsx`:
  - Bọc trong `<SettingsShell active="billing">`.
  - `Link` từ `@/i18n/navigation` (bỏ `next/link`). `useSearchParams` từ `next/navigation` giữ nguyên.
  - Nút "Nâng cấp / Gia hạn" → `ROUTES.pricing`.
  - Polish theo token: banner paid dùng `bg-class-good/10 text-class-good` (thay `green-100`), card dùng `Card/CardHeader/...`, status dùng `<Badge>`, bảng dùng `border-border`.
  - i18n các chuỗi hiển thị qua `settings.billing.*` (title, status, expires, history headers, paidBanner, upgrade, adminGranted, empty).
- **`api-keys/page.tsx`**: bọc nội dung hiện có trong `<SettingsShell active="api-keys">` (giữ logic, chỉ thêm chrome tab).
- **Xoá** `app/[locale]/(app)/billing/page.tsx` (đã move). Thư mục `billing/` vẫn còn `checkout/` + `upgrade/`.

### Checkout redirect + links
- `app/[locale]/(app)/billing/checkout/[intentId]/page.tsx`:
  - `router.push("/billing?paid=1")` → `router.push("/settings/billing?paid=1")` (2 chỗ: dòng 26, 52).
  - 2 link `/billing/upgrade` → `ROUTES.pricing`.

### Out of scope (Part 1)
- Redesign trang `/billing/upgrade` (giữ nguyên). Không tạo redirect `/billing`→`/settings/billing` (mọi tham chiếu đã update).
- i18n hoá toàn bộ trang upgrade/checkout (chỉ sửa link + redirect).

---

## Part 2 — Dev auto-confirm cron (gateway)

### New: `apps/gateway/src/billing/services/payment-intent.service.ts`
Thêm method liệt kê intent đang chờ còn hạn (cron cần để dựng payload):
```ts
async findActivePending(): Promise<{ refCode: string; amountVnd: number }[]> {
  return this.prisma.paymentIntent.findMany({
    where: { status: 'pending', expiresAt: { gt: new Date() } },
    select: { refCode: true, amountVnd: true },
  });
}
```

### New: `apps/gateway/src/billing/services/dev-autoconfirm.cron.ts`
- `@Injectable()`, inject `ConfigService`, `PaymentIntentService`, `CassoReconcilerService`.
- `@Cron(CronExpression.EVERY_MINUTE, { name: 'dev-autoconfirm' })`.
- Handler:
  1. **Guard**: `enabled = config.get('BILLING_DEV_AUTOCONFIRM') === 'true' && config.get('NODE_ENV') !== 'production'`. Nếu không → `return` (no-op).
  2. Lấy `findActivePending()`. Với mỗi intent → gọi `reconciler.handleWebhook({ tid: \`DEVAUTO-${refCode}-${Date.now()}\`, amount: amountVnd, description: refCode, when: new Date().toISOString() })`.
  3. Log: nếu confirm >0 → `logger.warn(\`[DEV] auto-confirmed N pending intent(s)\`)`.
- Constructor log cảnh báo to **một lần** nếu enabled: `"⚠️ BILLING_DEV_AUTOCONFIRM is ON — never enable in production"`.

### `apps/gateway/src/billing/billing.module.ts`
- Import + thêm `DevAutoConfirmCron` vào `providers`.

### Env
- `apps/gateway/.env` (local): thêm `BILLING_DEV_AUTOCONFIRM=true`.
- `.env.docker.example`: thêm `BILLING_DEV_AUTOCONFIRM=false` (mặc định tắt) + comment "dev/demo only".

### Safety notes
- Double-guard đảm bảo: kể cả flag lỡ bật ở prod, `NODE_ENV=production` vẫn chặn.
- Tái dùng `reconciler.handleWebhook` → idempotent (UNIQUE casso_txn_id) + publish `billing.confirmed` → FE socket tự nhảy success. Không nhân bản logic markPaid/upgrade.

---

## Testing (TDD)

**web (Vitest + RTL):**
- `SettingsShell` render đủ 4 tab; tab active đúng (`tests/unit/settings-shell.test.tsx`).
- Billing settings page: render plan + history + nút nâng cấp href `/pricing` (dùng `renderWithIntl`, mock `@/i18n/navigation`).

**gateway (Vitest/Jest):**
- `DevAutoConfirmCron`: flag off → `reconciler.handleWebhook` KHÔNG được gọi. Flag on + `NODE_ENV!=='production'` → gọi đúng N lần với payload khớp refCode/amount. `NODE_ENV==='production'` (dù flag on) → không gọi.

**Smoke:** bật flag local → tạo intent → trong ≤1 phút gói tự lên Pro, trang tự nhảy success (không cần fire tay).

## Files touched
1. `apps/web/src/lib/constants.ts`
2. `apps/web/src/components/settings/settings-shell.tsx`
3. `apps/web/src/app/[locale]/(app)/settings/api-keys/page.tsx`
4. `apps/web/src/app/[locale]/(app)/settings/billing/page.tsx` (moved + polish)
5. `apps/web/src/app/[locale]/(app)/billing/checkout/[intentId]/page.tsx`
6. `apps/web/src/messages/{vi,en}.json`
7. `apps/gateway/src/billing/services/payment-intent.service.ts`
8. `apps/gateway/src/billing/services/dev-autoconfirm.cron.ts` (new)
9. `apps/gateway/src/billing/billing.module.ts`
10. `apps/gateway/.env` (local) + `.env.docker.example`
11. Tests: `apps/web/tests/unit/settings-shell.test.tsx`, `apps/gateway/.../dev-autoconfirm.cron.spec.ts`

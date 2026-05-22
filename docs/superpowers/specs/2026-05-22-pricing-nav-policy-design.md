# Pricing Redesign + Marketing Navigation + Policy — Design

**Date:** 2026-05-22
**Branch:** `feat/subscriptions-vietqr-improve`
**Scope:** MEDIUM (single app: `web`). No proto / no Prisma / no `@repo/shared` change. No new gateway API.

## Problem

- `/pricing` chỉ tới được bằng cách **gõ URL tay** — không có trong navigation nào.
- Trang trơ trọi: **không header/footer**, các plan card phẳng, **thiếu thông tin** (không tick tính năng, không so sánh, không "phổ biến", không FAQ/chính sách).
- **Chưa có** trang chính sách/điều khoản nào.
- Nút "Nâng cấp" trong `QuotaExceededDialog` trỏ `/billing/upgrade`, tách rời `/pricing`.

## Decisions (chốt qua brainstorm + visual companion)

1. **Layout pricing = Hybrid (hướng C):** hero + card nâng cấp + bảng so sánh + FAQ/policy accordion.
2. **Navigation = "C + header policy":**
   - **Public header** trên trang marketing: logo · Bảng giá · Chính sách · (khách → Đăng nhập/Đăng ký; đã login → "Vào ứng dụng").
   - **Sidebar** (authed): thêm item "Bảng giá".
   - **Footer**: link Chính sách (anchor tới từng mục) + copyright.
3. **Policy = 1 trang gộp** `/policy`, 3 mục có anchor: `#dieu-khoan`, `#bao-mat`, `#thanh-toan`. Nội dung **demo tiếng Việt**.
4. **Modal "Nâng cấp" → `/pricing`** (đổi từ `/billing/upgrade`).

## Architecture

### Route structure — route group `(marketing)`
Tạo `apps/web/src/app/[locale]/(marketing)/layout.tsx` render `<PublicHeader/>` + `{children}` + `<PublicFooter/>` (PUBLIC, không AuthGuard). Route group **không thêm URL segment**.

- Move `app/[locale]/pricing/` → `app/[locale]/(marketing)/pricing/` — URL `/pricing` giữ nguyên.
- Thêm `app/[locale]/(marketing)/policy/page.tsx` — URL `/policy`.

**Hành vi quan trọng:** `/pricing` là **1 trang marketing dùng chung cho cả khách lẫn user đã login**. User đã login mở `/pricing` (từ sidebar hoặc modal) sẽ thấy **marketing layout (header/footer), KHÔNG có sidebar** — header có nút "Vào ứng dụng" để quay lại app shell. Đây là lựa chọn có chủ đích (đơn giản, YAGNI), không render pricing bên trong `(app)` shell.

### Components mới
| File | Loại | Vai trò |
|---|---|---|
| `components/layout/public-header.tsx` | client | Logo + nav (Bảng giá, Chính sách) + CTA auth-aware (đọc `useAuthStore`). Dùng `Link` + `useRouter` từ `@/i18n/navigation`. Kèm `LocaleSwitcher` + `ThemeToggle`. |
| `components/layout/public-footer.tsx` | client | Link Chính sách (`/policy#dieu-khoan`…), copyright, locale switcher. |
| `components/billing/PlanComparisonTable.tsx` | client | Bảng so sánh: hàng = tính năng, cột = gói; cột Pro nổi bật; tick ✓ / giá trị; đánh dấu gói "Đang dùng". Nhận `plans[]` + `currentPlanCode`. |
| `components/billing/PricingFaq.tsx` | client | Accordion FAQ + link "Xem chính sách đầy đủ" → `/policy`. |

### Components sửa
| File | Thay đổi |
|---|---|
| `components/billing/PlanCard.tsx` | Thêm tick ✓ mỗi dòng tính năng, ribbon "Phổ biến" (prop `popular`), tagline ngắn; giữ badge "Đang dùng" + nút Nâng cấp. |
| `components/layout/sidebar/index.tsx` | Thêm `NavItem` "Bảng giá" (`ROUTES.pricing`, icon `Sparkles`) — đặt sau "So sánh". |
| `components/billing/QuotaExceededDialog.tsx` | `<Link href="/billing/upgrade">` → `href={ROUTES.pricing}` (`/pricing`). |
| `app/[locale]/(marketing)/pricing/page.tsx` (moved) | Render hero + grid `PlanCard` + `PlanComparisonTable` + `PricingFaq`. Giữ logic `onSelect` (khách → `/login?next=/pricing`; gói trả phí → `useCreatePaymentIntent`). |
| `lib/constants.ts` | Thêm `ROUTES.pricing = "/pricing"`, `ROUTES.policy = "/policy"`. |

### Content & i18n
- **UI chrome** (nav labels, headings, nút, câu hỏi FAQ, nhãn dòng bảng so sánh) → i18n keys trong `messages/{vi,en}.json` (đủ 2 locale để tránh missing-message).
- **Nội dung dài** (thân chính sách + đáp án FAQ) → module TS tiếng Việt: `lib/content/policy.ts`, `lib/content/pricing-faq.ts` (1 nguồn, render giống nhau ở cả 2 locale tạm thời). **TODO** dịch EN — ghi nhận, ngoài phạm vi.

### Data flow
Dùng lại `usePlans()` + `useSubscription()` (`lib/queries/use-billing`). Bảng so sánh + card dùng chung `plansQ.data`. `useSubscription` chỉ để highlight "Đang dùng" — guard `subQ.data?.planCode`. **Không thêm endpoint gateway.**

## Testing (TDD)
- **Unit (`tests/unit/`, Vitest + RTL):**
  - `PlanComparisonTable` render đủ hàng từ `plans`, highlight đúng cột Pro + gói hiện tại.
  - `PricingFaq` toggle mở/đóng đúng item.
  - `PublicHeader` hiện CTA đúng theo trạng thái auth (khách vs đã login).
  - `QuotaExceededDialog` nút Nâng cấp link tới `/pricing`.
- **Lưu ý harness:** các component trên dùng `useTranslations` → test cần wrap `NextIntlClientProvider`. `tests/helpers/render.tsx` hiện **chưa** wrap intl (harness debt) → thêm `renderWithIntl` (nạp messages thật) trong helper. Phạm vi nhỏ, gắn với skill `fe-test-harness`.
- **Build:** `/pricing` và `/policy` xuất hiện trong route list; `/pricing` URL không đổi (route group). Smoke runtime: `/pricing`, `/policy`, `/vi/policy` → 200, intlErr:0.

## Out of scope
- Nội dung pháp lý thật (chỉ demo VI) + bản dịch EN của thân policy (TODO).
- Toggle tháng/năm (chỉ có giá theo tháng).
- Thiết kế lại / xoá trang `/billing/upgrade` (giữ nguyên, vẫn truy cập trực tiếp được dù modal đã trỏ `/pricing`).
- Sticky TOC trên trang policy (chỉ section + anchor đơn giản).

## Files touched
1. `app/[locale]/(marketing)/layout.tsx` (mới)
2. `app/[locale]/(marketing)/pricing/page.tsx` (moved + redesign)
3. `app/[locale]/(marketing)/policy/page.tsx` (mới)
4. `components/layout/public-header.tsx` (mới)
5. `components/layout/public-footer.tsx` (mới)
6. `components/billing/PlanComparisonTable.tsx` (mới)
7. `components/billing/PricingFaq.tsx` (mới)
8. `components/billing/PlanCard.tsx` (sửa)
9. `components/billing/QuotaExceededDialog.tsx` (sửa)
10. `components/layout/sidebar/index.tsx` (sửa)
11. `lib/constants.ts` (sửa — ROUTES)
12. `lib/content/policy.ts`, `lib/content/pricing-faq.ts` (mới)
13. `messages/vi.json`, `messages/en.json` (sửa — keys)
14. `tests/helpers/render.tsx` (sửa — renderWithIntl) + `tests/unit/*` (mới)

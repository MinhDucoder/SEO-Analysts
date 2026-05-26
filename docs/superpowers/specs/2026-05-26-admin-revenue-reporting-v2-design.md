# Thiết kế: Báo cáo doanh thu admin v2 (kỳ lịch + breakdown + so sánh + xuất CSV)

**Ngày:** 2026-05-26
**Tiền đề:** Mở rộng phần thống kê doanh thu admin (đã làm v1 — 3 thẻ gross/net/vat trong `/admin/stats`, hiện CHƯA commit). v2 tách doanh thu thành mục riêng với kỳ lịch dương, breakdown theo gói, so sánh kỳ trước, và xuất CSV cho mục đích kê khai thuế.

**Spec v1 liên quan:** `docs/superpowers/specs/2026-05-26-admin-revenue-tax-stats-design.md`

## Vấn đề

v1 lọc doanh thu theo cửa sổ trượt 7/30/90 ngày (chung dropdown với audit stats). VAT kê khai theo kỳ lịch dương (tháng/quý/năm) → "30 ngày gần nhất" không khớp "Tháng 4/2026". Cần kỳ lịch riêng cho doanh thu + công cụ đối chiếu/xuất file.

## Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Phạm vi bộ lọc kỳ lịch | **Tách riêng cho doanh thu** — audit/overview giữ dropdown 7/30/90 ngày (rolling); doanh thu có control Tháng/Quý/Năm riêng + nguồn dữ liệu riêng. |
| Nội dung CSV | **Cả hai** — phần tóm tắt ở đầu + danh sách giao dịch chi tiết bên dưới, trong 1 file. |
| Kiến trúc | **Cách A** — endpoint + service riêng (`AdminRevenueService`), KHÔNG nhồi vào `/admin/stats`. |
| Δ% so kỳ trước | Chỉ hiện trên thẻ Tổng doanh thu (net/vat cùng tỉ lệ → Δ% trùng). |
| Breakdown theo gói | Bỏ gói `free` (giá 0, không có giao dịch paid). Chỉ pro/business. |
| UI chọn kỳ | Toggle Tháng/Quý/Năm + nút ◀ ▶ điều hướng + nhãn giữa; mặc định kỳ hiện tại. Không date-picker phức tạp. |
| Định dạng xuất | CSV (UTF-8 BOM để Excel đọc tiếng Việt). KHÔNG .xlsx. |

## Nguồn dữ liệu

- `PaymentIntent` (`apps/gateway/prisma/schema.prisma:277`): `amountVnd`, `status` (`paid`), `paidAt`, `planCode`, `refCode`, quan hệ `user`.
- `Plan` (`schema.prisma:243`): `code` (PlanCode: free/pro/business), `displayName`, `priceVnd`.
- VAT 10% inclusive — tách từ gross như v1.

## Kỳ lịch (period) — mô hình tham số

Query params chung cho cả endpoint JSON và CSV:
- `type=month` + `year` + `month(1-12)` → `[YYYY-MM-01, YYYY-(MM+1)-01)`
- `type=quarter` + `year` + `quarter(1-4)` → 3 tháng của quý
- `type=year` + `year` → `[YYYY-01-01, (YYYY+1)-01-01)`
- Mặc định khi thiếu: `type=month`, kỳ hiện tại (theo giờ server).

Tất cả mốc tính theo **đầu/cuối kỳ lịch** (không rolling). Bound dạng `paidAt: { gte: start, lt: end }`.

Hàm thuần `resolvePeriod(query) → { type, year, month?, quarter?, start: Date, end: Date, label: string }` (tách riêng, test được độc lập). `label` dạng "Tháng 5/2026" / "Quý 2/2026" / "Năm 2026".

Kỳ liền trước (cho Δ%): `previousPeriod(period)` → month−1 (sang năm trước nếu tháng 1), quarter−1, year−1.

## Backend

### Service mới: `apps/gateway/src/admin/services/admin-revenue.service.ts`

Inject `PrismaService`. Hằng số `VAT_PERCENT = 10` (dùng chung — đặt tại đây; xóa khỏi admin.service khi gỡ revenue v1).

Hàm helper thuần (cùng file hoặc `admin-revenue.util.ts`):
- `resolvePeriod`, `previousPeriod` (như trên).
- `splitVat(gross) → { gross, vat, net }` với `vat = round(gross*10/110)`, `net = gross - vat`.

**`getRevenue(query)`** →
```ts
{
  period: { type, year, month?, quarter?, label, start: string, end: string },  // ISO
  grossVnd: number;
  netVnd: number;
  vatVnd: number;
  vatPercent: number;       // 10
  paidCount: number;
  deltaPercent: number | null;  // (gross - prevGross)/prevGross*100, làm tròn 2 số; null nếu prevGross===0
  byPlan: Array<{ planCode: string; displayName: string; count: number; grossVnd: number }>;  // pro/business, sort grossVnd desc
}
```
Truy vấn (Promise.all): aggregate gross+count kỳ hiện tại; aggregate gross kỳ trước (cho Δ%); `groupBy planCode` kỳ hiện tại; load `Plan` map (code→displayName). `byPlan` map planCode→displayName, loại `free`.

**`buildCsv(query) → { filename: string; content: string }`**
- Lấy `getRevenue` (tóm tắt) + danh sách giao dịch: `paymentIntent.findMany({ where: { status:'paid', paidAt:{gte,lt} }, include:{ user:{select:{email}} }, orderBy:{ paidAt:'asc' } })`.
- Nội dung:
  - BOM `﻿` ở đầu.
  - Khối tóm tắt: dòng "Kỳ", "Tổng doanh thu", "Doanh thu thuần", "Thuế VAT (10%)", "Số giao dịch", rồi breakdown từng gói.
  - 1 dòng trống.
  - Header chi tiết: `Mã GD,Ngày thanh toán,Email,Gói,Doanh thu (VND),VAT (VND),Doanh thu thuần (VND)`.
  - Mỗi giao dịch 1 dòng; mỗi GD tách vat/net riêng bằng `splitVat(amountVnd)`.
  - Escape CSV: bọc field chứa dấu phẩy/nháy/xuống dòng trong `"`, nhân đôi `"` bên trong.
- `filename`: `doanh-thu-<type>-<year>[-<month|Qquarter>].csv` (vd `doanh-thu-month-2026-05.csv`).

### Controller: `apps/gateway/src/admin/controllers/admin-revenue.controller.ts`

(Hoặc thêm route vào `admin.controller.ts` — chọn controller riêng cho gọn.) Guard `@Roles(ADMIN)` như admin hiện có.
- `GET /admin/revenue` → `service.getRevenue(query)`.
- `GET /admin/revenue/export.csv` → `@Res()` express: set `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="..."`, gửi `content`. Theo pattern [audits.controller export](apps/gateway/src/audits/controllers/audits.controller.ts#L113).

DTO query: `RevenueQueryDto` (`type?`, `year?`, `month?`, `quarter?` — validate range, ép số).

### Gỡ revenue v1 khỏi `/admin/stats`

- `admin.service.ts getStats()`: bỏ `revenueAgg` khỏi `Promise.all`, bỏ tính `grossVnd/vatVnd/netVnd`, bỏ `revenue` khỏi return. (Giữ `VAT_PERCENT`? Chuyển sang admin-revenue.service; xóa ở admin.service.)
- `admin.service.spec.ts`: bỏ 3 test revenue đã thêm ở v1, khôi phục 2 test getStats gốc (không revenue), bỏ mock `paymentIntent`.

## Frontend

### Type: `apps/web/src/lib/api/types.ts`
- Bỏ `revenue` khỏi `AdminStats` (revert v1).
- Thêm `AdminRevenue` (khớp `getRevenue` response) + `RevenuePeriodQuery` (type/year/month/quarter).

### API client: `apps/web/src/lib/api/admin.ts`
- `getAdminRevenue(query): Promise<AdminRevenue>` → `GET /admin/revenue?...`.
- `exportAdminRevenueCsv(query): Promise<void>` → fetch blob từ `/admin/revenue/export.csv`, tạo `<a download>` để tải (giữ JWT qua client hiện có).

### Hook: `apps/web/src/lib/queries/use-admin.ts`
- `useAdminRevenue(query)` → `useQuery<AdminRevenue>` (key gồm period).

### Component mới: `apps/web/src/components/admin/admin-revenue-section.tsx`
- State kỳ: `{ type, year, month, quarter }`, mặc định kỳ hiện tại.
- Control: toggle Tháng/Quý/Năm (đổi `type`) + ◀ ▶ (lùi/tiến 1 kỳ qua `previousPeriod`/nextPeriod ở FE hoặc tính tay) + nhãn `data.period.label` + nút "Xuất CSV".
- 3 thẻ KPI: Tổng doanh thu (`formatVnd(grossVnd)` + `paidCount` giao dịch + badge Δ% màu xanh/đỏ nếu `deltaPercent != null`), Doanh thu thuần, Thuế VAT (nhãn "VAT 10%").
- Bảng breakdown theo gói (list giống Top domain): mỗi dòng `displayName` — `count` GD — `formatVnd(grossVnd)`. Rỗng → thông báo "Chưa có giao dịch".
- Trạng thái loading/error riêng (Skeleton/thông báo).

### Gỡ revenue v1 khỏi `admin-stats-cards.tsx`
- Bỏ section 3 thẻ revenue + import `Wallet/Banknote/Receipt` + `formatVnd` (nếu không còn dùng). Giữ component cho audit stats như cũ.

### Page: `apps/web/src/app/[locale]/(app)/admin/stats/page.tsx`
- Render `<AdminStatsCards stats={...}>` (audit, rolling) như cũ + thêm `<AdminRevenueSection />` (tự fetch kỳ lịch riêng) bên dưới.

### i18n: `vi.json` + `en.json`
- Mở rộng `admin.stats` (hoặc nhóm mới `admin.revenue`): nhãn type (month/quarter/year), label kỳ (hoặc format ở FE), tiêu đề mục, gross/net/vat/vatLabel/transactions (tái dùng v1), delta ("so với kỳ trước"), nút export, header bảng breakdown, trạng thái rỗng.

## Kiểm thử

**Backend unit (`admin-revenue.service.spec.ts`):**
- `resolvePeriod`: month/quarter/year ra đúng `[start,end)`; mặc định = tháng hiện tại; biên tháng 1 → quý/năm.
- `previousPeriod`: tháng 1 → tháng 12 năm trước; quý 1 → quý 4 năm trước; year−1.
- `splitVat`: `net+vat===gross`, `vat=round(gross*10/110)`.
- `getRevenue`: lọc đúng `status='paid'` + `paidAt ∈ [start,end)`; `deltaPercent` đúng (và `null` khi prevGross=0); `byPlan` loại free, sort desc; kỳ rỗng → tất cả 0, byPlan=[].
- `buildCsv`: có BOM; có khối tóm tắt + header chi tiết + đúng số dòng giao dịch; escape field có dấu phẩy; filename đúng theo kỳ.

**Backend (`admin.service.spec.ts`):** cập nhật — getStats không còn revenue.

**FE unit:**
- `admin-revenue-section.test.tsx` (renderWithIntl + mock hook): render 3 thẻ + Δ% + bảng breakdown từ mock `AdminRevenue`; đổi toggle gọi refetch với type mới; nút Xuất CSV gọi `exportAdminRevenueCsv`.
- Cập nhật/bỏ `admin-stats-cards.test.tsx` phần revenue (đã chuyển đi).

## Phạm vi KHÔNG làm (YAGNI)
- Không .xlsx (chỉ CSV). Không refund/hoàn tiền. Không biểu đồ doanh thu. Không MRR/subscription-active. Không đa tiền tệ. Không migration DB (không thêm cột thuế). Không date-range tùy ý (chỉ tháng/quý/năm trọn).

## Rủi ro / lưu ý
- CSV danh sách giao dịch có thể lớn nếu kỳ dài (năm) — chấp nhận build in-memory ở quy mô hiện tại; nếu sau này lớn, chuyển stream.
- Δ% kỳ trước cần 1 query gross thêm — vẫn trong 1 `Promise.all`.
- Đảm bảo mọi mốc thời gian nhất quán timezone server (giống `getStats` hiện dùng `new Date`).
- v1 chưa commit: v2 thay thế phần revenue của v1; khi thực thi nhớ gỡ sạch v1 để tránh 2 nguồn doanh thu.

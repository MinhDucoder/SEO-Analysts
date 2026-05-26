# Thiết kế: Thống kê doanh thu & thuế trên trang Admin Stats

**Ngày:** 2026-05-26
**Phạm vi:** Thêm 3 thẻ KPI (Tổng doanh thu, Doanh thu thuần, Thuế VAT) vào trang Thống kê admin (`/[locale]/admin/stats`), tính theo khoảng thời gian (period) đang chọn.

## Mục tiêu

Trang Thống kê admin hiện chỉ có chỉ số về user và audit. Bổ sung thống kê doanh thu lấy từ các giao dịch thanh toán đã xác nhận, tách phần thuế VAT, phục vụ mục đích báo cáo doanh thu và thuế.

## Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Cách tính thuế | **VAT 10% đã gồm trong giá** (giá niêm yết là gross). Tách ngược, KHÔNG đổi DB. |
| Nội dung hiển thị | **3 thẻ tổng theo period**: Tổng doanh thu (gross), Doanh thu thuần (net), Thuế VAT. |
| Cách tiếp cận | **Cách A** — mở rộng endpoint `GET /admin/stats` hiện có (không tạo endpoint riêng). |

## Nguồn dữ liệu

Bảng `PaymentIntent` (Prisma, DB của gateway) — `apps/gateway/prisma/schema.prisma`:
- `amountVnd: Int` — số tiền giao dịch (VND, đã gồm VAT vì là giá niêm yết).
- `status: PaymentIntentStatus` — chỉ tính `'paid'`.
- `paidAt: DateTime?` — mốc thời gian xác nhận thanh toán (dùng để lọc theo period, KHÔNG dùng `createdAt`).
- `planCode` — không dùng ở phạm vi này (không breakdown theo gói).

Đây là nguồn duy nhất ghi nhận doanh thu thực thu. Subscription do admin cấp (`grantedBy != null`) không có PaymentIntent `paid` nên không tính vào doanh thu — đúng mong muốn.

## Công thức tính (tránh sai số làm tròn)

Tính trên **tổng gross** rồi tách, KHÔNG cộng dồn VAT từng giao dịch:

```
gross     = SUM(amountVnd)  WHERE status='paid' AND paidAt ∈ [periodStart, now]
paidCount = COUNT(*)        WHERE status='paid' AND paidAt ∈ [periodStart, now]
vat       = round(gross * VAT_PERCENT / (100 + VAT_PERCENT))   // = round(gross * 10/110)
net       = gross - vat                                         // net + vat == gross luôn khớp
```

`VAT_PERCENT = 10` là hằng số trong service. `periodStart` tính từ tham số `period` (7d/30d/90d) giống logic period sẵn có của `getStats()`.

Khi không có giao dịch nào: `gross = net = vat = 0`, `paidCount = 0`.

## Thay đổi backend

**File:** `apps/gateway/src/admin/services/admin.service.ts` — method `getStats(periodDays = 30)` (dòng ~117).

- Thêm 1 truy vấn `prisma.paymentIntent.aggregate` (`_sum.amountVnd`, `_count`) với điều kiện `status: 'paid'`, `paidAt: { gte: periodStart }` (chạy song song cùng các query hiện có qua `Promise.all` nếu đang dùng).
- Tính `vat`, `net` theo công thức trên; thêm khối `revenue` vào object trả về.
- Hằng số `VAT_PERCENT = 10` khai báo ở đầu service/file.

Giữ nguyên pattern hiện tại: admin.service query Prisma trực tiếp (không gọi qua PaymentIntentService) để nhất quán với cách nó đã query user/audit.

**Route giữ nguyên:** `GET /admin/stats?period=Xd` — `apps/gateway/src/admin/controllers/admin.controller.ts` (dòng ~67). Không thêm route mới.

## Response shape (mới)

Bổ sung khối `revenue` vào response `AdminStats`:

```ts
revenue: {
  grossVnd: number;   // tổng doanh thu (đã gồm VAT)
  netVnd: number;     // doanh thu thuần (chưa gồm VAT)
  vatVnd: number;     // tiền thuế VAT
  vatPercent: number; // 10
  paidCount: number;  // số giao dịch 'paid' trong period
}
```

Các field hiện có (`overview`, `newUsersToday`, `auditsToday`, `topDomains`) giữ nguyên — thay đổi mang tính cộng thêm (additive), không phá vỡ tương thích.

## Thay đổi frontend

**Type:** `apps/web/src/lib/api/types.ts` — thêm khối `revenue` (như trên) vào interface `AdminStats`.

**Component:** `apps/web/src/components/admin/admin-stats-cards.tsx` — thêm 3 thẻ:
- **Tổng doanh thu** — `grossVnd`, phụ chú "`paidCount` giao dịch".
- **Doanh thu thuần** — `netVnd`.
- **Thuế VAT** — `vatVnd`, nhãn phụ "VAT `vatPercent`%".

Tiền hiển thị định dạng VND (vd `9.000.000 ₫`) — dùng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` hoặc helper format tiền sẵn có trong `apps/web` nếu đã tồn tại.

Hook `useAdminStats` và API client `getAdminStats` giữ nguyên (chỉ type mở rộng).

## Kiểm thử

- **Unit (gateway):** test `admin.service.getStats()` với dữ liệu PaymentIntent giả lập — kiểm:
  - Chỉ tính `status='paid'` (bỏ qua `pending`/`expired`/`failed`).
  - Lọc đúng theo `paidAt` trong period (giao dịch ngoài period bị loại).
  - `net + vat === gross`; `vat === round(gross*10/110)`.
  - Trường hợp 0 giao dịch → tất cả = 0.
- **FE:** render `admin-stats-cards` với mock `revenue`, kiểm 3 thẻ hiện đúng số đã format. (Theo skill `fe-test-harness` nếu trả nợ test; không thuộc L4 vì không đụng auth/session/payment wire-level — chỉ đọc số liệu admin.)

## Phạm vi KHÔNG làm (YAGNI)

- Không migration DB / không thêm field thuế vào `PaymentIntent`.
- Không breakdown doanh thu theo gói (pro/business).
- Không biểu đồ doanh thu theo ngày.
- Không thẻ "doanh thu hôm nay".
- Không đa tiền tệ (chỉ VND).
- Không endpoint `/admin/revenue` riêng.

## Rủi ro / lưu ý

- VAT suất là hằng số `10`. Nếu sau này cần đổi (vd mức giảm 8%), sửa 1 hằng số — đã cô lập.
- Doanh thu chỉ phản ánh giao dịch `paid`; nếu reconciler webhook Casso bỏ sót giao dịch thì doanh thu thiếu — nằm ngoài phạm vi feature này.

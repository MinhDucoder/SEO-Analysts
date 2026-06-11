# On-demand AI Suggest + tính lượt theo subscription

**Date:** 2026-05-25
**Status:** Approved
**Scope:** gateway + report + proto + web

## Vấn đề

AI suggest cho audit hiện chạy **tự động** ngay sau khi audit xong, **một lần cho tất cả** rule fail/warn, và **không hề đụng tới billing**. Plan đã định nghĩa quota `ai_calls_monthly` (free=0, pro=100, business=1000) + `FeatureFlag.AI_SUGGESTIONS` (chỉ pro/business) nhưng luồng audit AI-suggest bỏ qua hết → ai cũng dùng free, không trừ lượt. Không khớp mô hình subscription.

## Quyết định đã chốt

1. **1 button batch / 1 lượt**: một button ở phía trên danh sách issue. Click 1 lần → generate gợi ý cho TẤT CẢ issue fail/warn cùng lúc (1 LLM call như hiện tại), trừ **1** lượt `ai_calls_monthly`.
2. **Sync gRPC**: gateway gọi report service đồng bộ, chờ xong, **chỉ trừ lượt khi thành công**.
3. **Disable + upsell**: free (thiếu feature) hoặc hết lượt → button mờ + dialog nâng cấp (tái dùng cơ chế modal 403/429 có sẵn). Admin + billing-off luôn dùng được.
4. **Khóa, không tạo lại**: đã generate rồi → hiện luôn, button biến mất; muốn mới thì re-run audit.

## Kiến trúc hiện tại (tham chiếu)

- Report `AiSuggestListener` nghe Redis `report.done` → enqueue BullMQ `ai-suggest.start` (gate bằng env `SEO_AI_ENABLED`).
- `AiSuggestWorker` → `AiSuggestService.generate(auditId)`: lọc rule fail/warn (top 20 theo weight) → 1 LLM call → lưu cột `Report.aiSuggestions` (`{items, model, promptHash, generatedAt, error?}`) → publish `audit.suggestions.done`.
- Gateway `getReport` gRPC map `aiSuggestions[]` + `aiSuggestionsGeneratedAt` từ cột report.
- Gateway WS relay `audit.suggestions.done` → `audit:suggestions-done`.
- FE `completed-report.tsx` đọc `report.aiSuggestions`, `aiPending = !aiSuggestionsGeneratedAt`, tự render card "AI Gợi ý" dưới mỗi issue fail.

## Thiết kế chi tiết

### 1. Report service — tắt auto-run + gRPC đồng bộ

- **Tắt auto-run:** gỡ subscription `report.done` trong `ai-suggest.listener.ts`. Vì chạy đồng bộ, BullMQ worker `ai-suggest.worker.ts` + queue `ai-suggest.start` + relay WS `audit.suggestions.done` thành dead code → gỡ luôn (gồm cập nhật `ai-suggest.module.ts` và phần relay trong gateway `progress-subscriber.service.ts`, và handler `audit:suggestions-done` ở FE `use-audit-realtime.ts`).
- **`AiSuggestService.generate()`**: thêm idempotency guard — nếu `report.aiSuggestions?.generatedAt` đã có và không phải marker lỗi → trả kết quả cũ, **không** gọi LLM. Tách giá trị trả về thành `{ status, suggestions, generatedAt }`.
- **`GenerateSuggestions` gRPC** trong `report.grpc.controller.ts` → gọi `AiSuggestService.generate()`, map sang response.

Bảng `status`:

| status | nghĩa | gateway |
|---|---|---|
| `generated` | LLM vừa chạy OK | trừ 1 lượt, 200 |
| `already` | đã có từ trước | 200, không trừ |
| `empty` | không có rule fail/warn | 200, không trừ |
| `disabled` | `SEO_AI_ENABLED !== 'true'` | 503, không trừ |
| `failed` | LLM lỗi/guardrail | 502, không trừ |

### 2. Proto

`packages/proto/report/v1/report.proto`:
```proto
rpc GenerateSuggestions(GenerateSuggestionsRequest) returns (GenerateSuggestionsResponse);

message GenerateSuggestionsRequest { string audit_id = 1; }
message GenerateSuggestionsResponse {
  string status = 1;                       // generated|already|empty|disabled|failed
  int32 count = 2;
  repeated AiSuggestion ai_suggestions = 3; // tái dùng message có sẵn
  string ai_suggestions_generated_at = 4;
}
```
Regenerate `.d.ts` đi kèm.

### 3. Gateway — endpoint + tính lượt

- **`POST /audits/:id/suggest`** (`audits.controller.ts`): `JwtAuthGuard` (class-level) + `@UseGuards(PlanGuard)` + `@RequireFeature(FeatureFlag.AI_SUGGESTIONS)`.
  - `PlanGuard` lo: free thiếu feature → 403 (FE auto dialog upsell); admin + billing-off → bypass.
- **`AuditsService.suggest(userId, role, auditId)`**:
  1. ownership check + `ensureCompleted`.
  2. Gate quota **trước** khi gọi LLM: nếu `billingEnforced && !isAdmin` → `counter.peek('ai_calls_monthly', limit)`; `remaining <= 0` → ném `QuotaExceededError` (429).
  3. gọi `reportClient.generateSuggestions(auditId)`.
  4. nếu `status === 'generated'` và `billingEnforced && !isAdmin` → `counter.consume('ai_calls_monthly', limit, 1)`.
  5. map status → HTTP (xem bảng) ; trả `{ status, count, remaining }`.
- `ReportGrpcClient.generateSuggestions(auditId)` trong `report.client.ts`.
- `EntitlementService` cần expose helper `billingEnforced()` public (hoặc inject ConfigService vào AuditsService) để quyết định có trừ lượt không.

### 4. Frontend

- `lib/api/audits.ts`: `suggestAudit(id): Promise<{status; count; remaining}>` → `POST audits/:id/suggest`.
- `lib/queries/use-audits.ts`: `useSuggestAudit(id)` mutation → onSuccess invalidate `queryKeys.audits.detail(id)`.
- **Button "✨ Tạo gợi ý AI"** ở header card Rules trong `completed-report.tsx` (phía trên danh sách issue):
  - Hiện khi: completed single + có rule fail/warn + `!aiSuggestionsGeneratedAt`.
  - Disable + tooltip "Nâng cấp Pro để dùng AI gợi ý" khi `useSubscription()` thấy plan thiếu feature `ai_suggestions`.
  - `mutation.isPending` → spinner trên button + card "AI đang phân tích..." dưới mỗi issue fail.
  - Xong → button biến mất, card AI render dưới mỗi issue.
- **Sửa `aiPending`:** bỏ logic `aiPending = !aiSuggestionsGeneratedAt` (sẽ kẹt loading vĩnh viễn sau khi tắt auto-run). Loading **chỉ** khi mutation chạy; bình thường chỉ render `AiSuggestionCard` khi có `aiSuggestion`.

## Components & boundaries

- **report**: sinh nội dung gợi ý (LLM), không biết gì về user/subscription. Idempotent theo `auditId`.
- **gateway**: chủ sở hữu quota/feature. Là nơi duy nhất tính lượt. Gọi report đồng bộ.
- **web**: UI button + trạng thái; tái dùng modal upsell có sẵn cho 403/429.

## Error handling

- LLM lỗi → report trả `failed`, gateway 502, **không** trừ lượt → FE toast cho retry.
- Race 2 click đồng thời: button khóa sau click + idempotency `already` ở report → tối đa double-charge 1 lượt trong cửa sổ rất hẹp (chấp nhận với app 1 user/audit).
- Billing tắt: vẫn chạy, không trừ lượt (log would-enforce như guard hiện có).

## Testing

- **BE unit**: `AiSuggestService` (idempotency: already/empty/disabled/failed); `AuditsService.suggest` (consume chỉ khi `generated`; peek chặn 429; skip khi billing-off/admin).
- **BE integration**: `POST /audits/:id/suggest` happy path + 403 free + 429 hết lượt.
- **FE (L1–L3, fe-test-harness)**: button states hidden/disabled/loading/done; gọi đúng endpoint; invalidate detail. Không cần L4.

## Out of scope (YAGNI)

- Per-issue suggest button / per-issue quota.
- Regenerate / re-charge.
- Endpoint usage riêng để hiện "còn X lượt" (đã trả `remaining` trong response; FE chỉ cần dùng nếu muốn).
- Streaming kết quả LLM.

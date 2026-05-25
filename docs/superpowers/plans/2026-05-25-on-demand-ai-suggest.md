# On-demand AI Suggest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển AI suggest từ auto-run sau audit sang chạy theo yêu cầu qua 1 button, mỗi lần thành công trừ 1 lượt `ai_calls_monthly` theo subscription.

**Architecture:** Trigger đi qua gateway (giữ quota/feature) → gọi report service đồng bộ bằng gRPC `GenerateSuggestions`. Report giữ logic LLM (idempotent theo auditId). Gateway là nơi duy nhất tính lượt. FE thêm button "Tạo gợi ý AI" + sửa loading.

**Tech Stack:** NestJS, gRPC (@grpc/proto-loader, runtime load — KHÔNG codegen), Prisma, BullMQ (gỡ), Redis quota counter, Next.js 15 + React 19 + TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-25-on-demand-ai-suggest-design.md`

---

## File Structure

**Report service**
- Modify: `apps/report/src/report/ai-suggest/services/ai-suggest.service.ts` — thêm `generateOnce()` + types (giữ `generate()` nguyên).
- Modify: `apps/report/src/report/controllers/report.grpc.controller.ts` — thêm `@GrpcMethod GenerateSuggestions` + inject `AiSuggestService`.
- Modify: `apps/report/src/report/ai-suggest/ai-suggest.module.ts` — export `AiSuggestService`, gỡ listener+worker+queue.
- Delete: `apps/report/src/report/ai-suggest/controllers/ai-suggest.listener.ts`, `apps/report/src/report/ai-suggest/controllers/ai-suggest.worker.ts`.
- Test: `apps/report/test/unit/ai-suggest.service.spec.ts` — thêm describe cho `generateOnce`.

**Proto**
- Modify: `packages/proto/report/v1/report.proto` — thêm rpc + 2 message.

**Gateway**
- Modify: `apps/gateway/src/infra/grpc/report.client.ts` — thêm `generateSuggestions()`.
- Modify: `apps/gateway/src/audits/services/audits.service.ts` — thêm `suggest()` + inject ConfigService + QuotaCounterService.
- Modify: `apps/gateway/src/audits/controllers/audits.controller.ts` — thêm `POST :id/suggest`.
- Test: `apps/gateway/test/unit/audits.service.spec.ts` — cập nhật constructor + thêm tests cho `suggest`.

**Web**
- Modify: `apps/web/src/lib/api/audits.ts` — thêm `suggestAudit()`.
- Modify: `apps/web/src/lib/queries/use-audits.ts` — thêm `useSuggestAudit()`.
- Modify: `apps/web/src/components/audit-detail/completed-report.tsx` — button + sửa `aiPending`.
- Test: `apps/web/src/components/audit-detail/__tests__/completed-report.test.tsx` (nếu harness sẵn) — button states.

> **Lưu ý phạm vi (deviation từ spec):** WS relay `audit.suggestions.done` ở gateway `progress-subscriber.service.ts` + handler `audit:suggestions-done` ở FE `use-audit-realtime.ts` để **nguyên** (dead nhưng vô hại, không còn publisher) để giảm blast radius. Không gỡ.

---

## Task 1: Proto — thêm GenerateSuggestions

**Files:** Modify `packages/proto/report/v1/report.proto`

- [ ] **Step 1: Thêm rpc vào service block**

Trong `service ReportService { ... }`, thêm dòng sau dòng `GeneratePdf`:
```proto
  rpc GenerateSuggestions(GenerateSuggestionsRequest) returns (GenerateSuggestionsResponse);
```

- [ ] **Step 2: Thêm message (đặt ngay dưới message `AiSuggestion`)**

```proto
message GenerateSuggestionsRequest { string audit_id = 1; }

message GenerateSuggestionsResponse {
  string status = 1;                        // generated|already|empty|disabled|failed
  int32 count = 2;
  repeated AiSuggestion ai_suggestions = 3;
  string ai_suggestions_generated_at = 4;   // ISO timestamp, empty khi chưa có
}
```

- [ ] **Step 3: Verify proto load (no codegen — runtime loadSync)**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN" && node -e "const {loadSync}=require('@grpc/proto-loader'); const {PROTO_ROOT}=require('./packages/proto/dist'); const d=loadSync(require('path').join(PROTO_ROOT,'report/v1/report.proto'),{includeDirs:[PROTO_ROOT]}); console.log(!!d['report.v1.ReportService'])"`
Expected: in ra `true` (proto parse OK). Nếu `@repo/proto/dist` chưa build: `npm run build --workspace=@repo/proto` trước.

- [ ] **Step 4: Commit**
```bash
git add packages/proto/report/v1/report.proto
git commit -m "feat(proto): add ReportService.GenerateSuggestions rpc"
```

---

## Task 2: Report — generateOnce() idempotent + status

**Files:** Modify `apps/report/src/report/ai-suggest/services/ai-suggest.service.ts`; Test `apps/report/test/unit/ai-suggest.service.spec.ts`

- [ ] **Step 1: Viết tests (append vào cuối spec file, ngoài describe hiện có)**

```ts
describe('AiSuggestService.generateOnce', () => {
  beforeEach(() => { process.env.SEO_AI_ENABLED = 'true'; });

  it('returns already + skips LLM when prior success exists', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue({
      ...fakeReport,
      aiSuggestions: { items: [{ ruleId: 'title-tag', explanation: 'x'.repeat(12), actionable_fix: 'y'.repeat(12) }], generatedAt: '2026-01-01T00:00:00.000Z', model: 'm', promptHash: 'h' },
    }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('already');
    expect(out.suggestions).toHaveLength(1);
    expect(deps.llm.invoke).not.toHaveBeenCalled();
  });

  it('returns generated when LLM produced items', async () => {
    const deps = makeDeps();
    // 1st read: no prior. 2nd read (post-generate): persisted items.
    deps.prisma.report.findUnique = vi.fn()
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce({ ...fakeReport, aiSuggestions: { items: [{ ruleId: 'title-tag', explanation: 'x'.repeat(12), actionable_fix: 'y'.repeat(12) }], generatedAt: '2026-01-02T00:00:00.000Z', model: 'm', promptHash: 'h' } }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('generated');
    expect(out.suggestions).toHaveLength(1);
  });

  it('returns empty when no failing rules', async () => {
    const noFail = { ...fakeReport, analysisSnapshot: { ruleResults: [{ ruleId: 'x', ruleName: 'X', status: 'pass', weight: 5, category: 'meta', message: '', suggestion: null }] } };
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn()
      .mockResolvedValueOnce(noFail)
      .mockResolvedValueOnce(noFail)
      .mockResolvedValueOnce({ ...noFail, aiSuggestions: { items: [], generatedAt: '2026-01-02T00:00:00.000Z', model: 'm', promptHash: '' } }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('empty');
    expect(deps.llm.invoke).not.toHaveBeenCalled();
  });

  it('returns disabled when SEO_AI_ENABLED=false', async () => {
    process.env.SEO_AI_ENABLED = 'false';
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn()
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce({ ...fakeReport, aiSuggestions: { items: [], generatedAt: '2026-01-02T00:00:00.000Z', model: 'disabled', promptHash: '', error: 'disabled' } }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('disabled');
  });

  it('returns failed when LLM throws', async () => {
    const deps = makeDeps();
    deps.llm.invoke = vi.fn().mockRejectedValue(new Error('boom')) as AnyMock;
    deps.prisma.report.findUnique = vi.fn()
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce({ ...fakeReport, aiSuggestions: { items: [], generatedAt: '2026-01-02T00:00:00.000Z', model: 'm', promptHash: 'h', error: 'llm_failed' } }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('failed');
  });

  it('throws when report not found', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(null) as AnyMock;
    const svc = buildService(deps);
    await expect(svc.generateOnce('missing')).rejects.toThrow(/report not found/);
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

Run: `cd apps/report && npx vitest run test/unit/ai-suggest.service.spec.ts`
Expected: FAIL — `svc.generateOnce is not a function`.

- [ ] **Step 3: Implement `generateOnce` + types**

Trong `ai-suggest.service.ts`, sau import của `suggestion.schema`, thêm export type:
```ts
export type GenerateStatus = 'generated' | 'already' | 'empty' | 'disabled' | 'failed';
export interface GenerateOutcome {
  status: GenerateStatus;
  suggestions: Suggestion[];
  generatedAt: string | null;
}
```
Thêm method vào class `AiSuggestService` (sau `generate`):
```ts
  /**
   * Idempotent, on-demand entry point used by the gateway (sync gRPC). Returns
   * a status the gateway maps to HTTP + quota: only `generated` consumes a
   * lượt. A prior successful run (generatedAt set, no error marker) short-
   * circuits as `already` — never re-runs the LLM. Prior disabled/failed
   * markers do NOT lock; they allow a retry.
   */
  async generateOnce(auditId: string): Promise<GenerateOutcome> {
    const existing = await this.prisma.report.findUnique({ where: { auditId } });
    if (!existing) throw new Error(`report not found for auditId=${auditId}`);
    const prior = existing.aiSuggestions as unknown as PersistedAiSuggestions | null;
    if (prior?.generatedAt && !prior.error) {
      return { status: 'already', suggestions: prior.items ?? [], generatedAt: prior.generatedAt };
    }

    try {
      await this.generate(auditId);
    } catch {
      // generate() persists an 'llm_failed' marker before rethrowing; classify
      // from the freshly-read column below.
    }

    const fresh = await this.prisma.report.findUnique({ where: { auditId } });
    const ai = (fresh?.aiSuggestions as unknown as PersistedAiSuggestions | null) ?? null;
    if (!ai) return { status: 'failed', suggestions: [], generatedAt: null };
    if (ai.error === 'disabled') return { status: 'disabled', suggestions: [], generatedAt: ai.generatedAt };
    if (ai.error === 'llm_failed' || ai.error === 'parse_failed') {
      return { status: 'failed', suggestions: [], generatedAt: ai.generatedAt };
    }
    const items = ai.items ?? [];
    return { status: items.length > 0 ? 'generated' : 'empty', suggestions: items, generatedAt: ai.generatedAt };
  }
```

- [ ] **Step 4: Run tests — verify pass**

Run: `cd apps/report && npx vitest run test/unit/ai-suggest.service.spec.ts`
Expected: PASS (cả describe cũ + mới).

- [ ] **Step 5: Commit**
```bash
git add apps/report/src/report/ai-suggest/services/ai-suggest.service.ts apps/report/test/unit/ai-suggest.service.spec.ts
git commit -m "feat(report): add idempotent generateOnce for on-demand AI suggest"
```

---

## Task 3: Report — gRPC method GenerateSuggestions + export service

**Files:** Modify `apps/report/src/report/controllers/report.grpc.controller.ts`, `apps/report/src/report/ai-suggest/ai-suggest.module.ts`

- [ ] **Step 1: Export AiSuggestService từ AiSuggestModule**

Trong `ai-suggest.module.ts`, thêm `exports: [AiSuggestService]` vào `@Module({...})` (cùng cấp với `providers`).

- [ ] **Step 2: Inject AiSuggestService vào ReportGrpcController**

Thêm import:
```ts
import { AiSuggestService } from '../ai-suggest/services/ai-suggest.service';
```
Thêm vào constructor (param cuối):
```ts
    private readonly aiSuggest: AiSuggestService,
```

- [ ] **Step 3: Thêm @GrpcMethod (đặt sau `getReport`)**
```ts
  @GrpcMethod('ReportService', 'GenerateSuggestions')
  async generateSuggestions(req: { auditId: string }) {
    const outcome = await this.aiSuggest.generateOnce(req.auditId);
    return {
      status: outcome.status,
      count: outcome.suggestions.length,
      aiSuggestions: outcome.suggestions.map((it) => ({
        ruleId: it.ruleId,
        explanation: it.explanation,
        actionableFix: it.actionable_fix,
      })),
      aiSuggestionsGeneratedAt: outcome.generatedAt ?? '',
    };
  }
```

- [ ] **Step 4: Verify build + existing report tests**

Run: `cd apps/report && npx tsc --noEmit && npx vitest run`
Expected: type OK; tests PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/report/src/report/controllers/report.grpc.controller.ts apps/report/src/report/ai-suggest/ai-suggest.module.ts
git commit -m "feat(report): expose GenerateSuggestions gRPC method"
```

---

## Task 4: Report — gỡ auto-run (listener + worker + queue)

**Files:** Modify `apps/report/src/report/ai-suggest/ai-suggest.module.ts`; Delete listener + worker

- [ ] **Step 1: Gỡ khỏi module**

Trong `ai-suggest.module.ts`:
- Xóa import `AiSuggestListener`, `AiSuggestWorker`, `BullModule`, `BULLMQ_QUEUES`.
- Xóa toàn bộ `BullModule.forRootAsync({...})` và `BullModule.registerQueue(...)` khỏi `imports` (giữ `ConfigModule` import? — không còn cần; `imports` có thể thành `[]`).
- Xóa `AiSuggestListener`, `AiSuggestWorker` khỏi `providers`.

Kết quả module rút gọn (chỉ còn PROMPT_LOADER, LLM_PROVIDER, AiSuggestService + exports). Đảm bảo `imports` không tham chiếu BullModule nữa.

- [ ] **Step 2: Xóa file listener + worker**
```bash
git rm apps/report/src/report/ai-suggest/controllers/ai-suggest.listener.ts apps/report/src/report/ai-suggest/controllers/ai-suggest.worker.ts
```

- [ ] **Step 3: Verify không còn tham chiếu**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN" && rg -n "AiSuggestListener|AiSuggestWorker|AI_SUGGEST_START" apps/report/src`
Expected: không có kết quả.

- [ ] **Step 4: Build + test**

Run: `cd apps/report && npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A apps/report/src/report/ai-suggest/
git commit -m "refactor(report): remove auto-run AI suggest listener+worker (now on-demand)"
```

---

## Task 5: Gateway — report gRPC client method

**Files:** Modify `apps/gateway/src/infra/grpc/report.client.ts`

- [ ] **Step 1: Thêm method vào interface `ReportService`** (sau `GeneratePdf`)
```ts
  GenerateSuggestions(
    req: { auditId: string },
    cb: (
      err: Error | null,
      res?: {
        status: string;
        count: number;
        aiSuggestions: { ruleId: string; explanation: string; actionableFix: string }[];
        aiSuggestionsGeneratedAt: string;
      },
    ) => void,
  ): void;
```

- [ ] **Step 2: Thêm public method** (sau `generatePdf`)
```ts
  generateSuggestions(auditId: string) {
    return this.call<
      { auditId: string },
      {
        status: string;
        count: number;
        aiSuggestions: { ruleId: string; explanation: string; actionableFix: string }[];
        aiSuggestionsGeneratedAt: string;
      }
    >('GenerateSuggestions', { auditId });
  }
```

- [ ] **Step 3: Build**

Run: `cd apps/gateway && npx tsc --noEmit`
Expected: OK.

- [ ] **Step 4: Commit**
```bash
git add apps/gateway/src/infra/grpc/report.client.ts
git commit -m "feat(gateway): add generateSuggestions report gRPC client"
```

---

## Task 6: Gateway — AuditsService.suggest + endpoint + quota

**Files:** Modify `apps/gateway/src/audits/services/audits.service.ts`, `apps/gateway/src/audits/controllers/audits.controller.ts`, `apps/gateway/test/unit/audits.service.spec.ts`

- [ ] **Step 1: Cập nhật spec construction + thêm tests**

Trong `audits.service.spec.ts`, thêm 2 mock deps trước `beforeEach`:
```ts
  const config = { get: vi.fn().mockReturnValue('true') }; // BILLING_FEATURE_ENABLED
  const counter = {
    peek: vi.fn().mockResolvedValue({ allowed: true, used: 0, remaining: 100, resetAt: new Date() }),
    consume: vi.fn().mockResolvedValue({ allowed: true, used: 1, remaining: 99, resetAt: new Date() }),
  };
```
Thêm `reportClient.generateSuggestions` vào mock reportClient:
```ts
  const reportClient = {
    getReport: vi.fn().mockRejectedValue(new Error('down')),
    generateSuggestions: vi.fn(),
  };
```
Cập nhật `new AuditsService(...)` thêm 2 param cuối:
```ts
    svc = new AuditsService(
      prisma as never, rl as never, redis as never, producer as never,
      reportClient as never, entitlement as never, config as never, counter as never,
    );
```
Thêm describe mới:
```ts
  describe('suggest', () => {
    const completedSingle = { id: 'a1', userId: 'u1', mode: 'single', status: AuditStatus.COMPLETED };

    it('generated → consumes 1 lượt and returns remaining', async () => {
      prisma.audit.findUnique.mockResolvedValueOnce(completedSingle);
      entitlement.isAdmin.mockResolvedValueOnce(false);
      entitlement.getEffectivePlan.mockResolvedValueOnce('pro');
      reportClient.generateSuggestions.mockResolvedValueOnce({ status: 'generated', count: 3, aiSuggestionsGeneratedAt: 'x' });
      const out = await svc.suggest('u1', UserRole.USER, 'a1');
      expect(reportClient.generateSuggestions).toHaveBeenCalledWith('a1');
      expect(counter.consume).toHaveBeenCalledWith('u1', 'ai_calls_monthly', 100, 1);
      expect(out).toMatchObject({ status: 'generated', count: 3 });
    });

    it('already → does NOT consume', async () => {
      prisma.audit.findUnique.mockResolvedValueOnce(completedSingle);
      entitlement.getEffectivePlan.mockResolvedValueOnce('pro');
      reportClient.generateSuggestions.mockResolvedValueOnce({ status: 'already', count: 2, aiSuggestionsGeneratedAt: 'x' });
      await svc.suggest('u1', UserRole.USER, 'a1');
      expect(counter.consume).not.toHaveBeenCalled();
    });

    it('blocks with 429 when quota exhausted (peek before LLM)', async () => {
      prisma.audit.findUnique.mockResolvedValueOnce(completedSingle);
      entitlement.getEffectivePlan.mockResolvedValueOnce('pro');
      counter.peek.mockResolvedValueOnce({ allowed: false, used: 100, remaining: 0, resetAt: new Date() });
      await expect(svc.suggest('u1', UserRole.USER, 'a1')).rejects.toMatchObject({ status: 429 });
      expect(reportClient.generateSuggestions).not.toHaveBeenCalled();
    });

    it('admin → skips metering entirely', async () => {
      prisma.audit.findUnique.mockResolvedValueOnce(completedSingle);
      entitlement.isAdmin.mockResolvedValueOnce(true);
      reportClient.generateSuggestions.mockResolvedValueOnce({ status: 'generated', count: 1, aiSuggestionsGeneratedAt: 'x' });
      await svc.suggest('admin', UserRole.ADMIN, 'a1');
      expect(counter.peek).not.toHaveBeenCalled();
      expect(counter.consume).not.toHaveBeenCalled();
    });

    it('billing off → skips metering', async () => {
      config.get.mockReturnValueOnce('false');
      prisma.audit.findUnique.mockResolvedValueOnce(completedSingle);
      reportClient.generateSuggestions.mockResolvedValueOnce({ status: 'generated', count: 1, aiSuggestionsGeneratedAt: 'x' });
      await svc.suggest('u1', UserRole.USER, 'a1');
      expect(counter.consume).not.toHaveBeenCalled();
    });

    it('site mode → BadRequest', async () => {
      prisma.audit.findUnique.mockResolvedValueOnce({ ...completedSingle, mode: 'site' });
      await expect(svc.suggest('u1', UserRole.USER, 'a1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('status disabled → 503', async () => {
      prisma.audit.findUnique.mockResolvedValueOnce(completedSingle);
      entitlement.getEffectivePlan.mockResolvedValueOnce('pro');
      reportClient.generateSuggestions.mockResolvedValueOnce({ status: 'disabled', count: 0, aiSuggestionsGeneratedAt: '' });
      await expect(svc.suggest('u1', UserRole.USER, 'a1')).rejects.toMatchObject({ status: 503 });
      expect(counter.consume).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run — verify fail**

Run: `cd apps/gateway && npx vitest run test/unit/audits.service.spec.ts`
Expected: FAIL — `svc.suggest is not a function` (+ constructor arity changes compile).

- [ ] **Step 3: Implement suggest() + DI**

Trong `audits.service.ts`:
- Thêm imports:
```ts
import { ServiceUnavailableException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuotaCounterService } from '../../billing/services/quota-counter.service';
import { QuotaExceededError } from '../../billing/domain/billing.errors';
import { PLAN_FEATURES } from '@repo/shared';
```
(Lưu ý: `ServiceUnavailableException`, `BadGatewayException` thêm vào dòng import `@nestjs/common` hiện có; `AuditMode`, `AuditStatus`, `UserRole` đã import sẵn.)
- Thêm vào constructor (2 param cuối):
```ts
    private readonly config: ConfigService,
    private readonly counter: QuotaCounterService,
```
- Thêm method (cuối class, trước dấu `}` đóng class):
```ts
  /**
   * On-demand AI suggestion for a completed single-mode audit. Quota
   * (`ai_calls_monthly`) is metered HERE — the only place that knows the
   * user's subscription. Peek before the (expensive) LLM call; consume 1
   * lượt ONLY when the report service reports `generated`. Admin + billing-off
   * bypass metering (mirrors PlanGuard/QuotaGuard).
   */
  async suggest(userId: string, role: UserRole, auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Khong co quyen xem audit nay');
    }
    if (audit.mode !== AuditMode.SINGLE) {
      throw new BadRequestException('AI goi y chi ho tro audit don trang');
    }
    if (audit.status !== AuditStatus.COMPLETED) {
      throw new BadRequestException('Audit chua hoan thanh');
    }

    const billingOn = this.config.get<string>('BILLING_FEATURE_ENABLED') === 'true';
    const isAdmin = await this.entitlement.isAdmin(userId);
    const meter = billingOn && !isAdmin;

    let limit = 0;
    if (meter) {
      const plan = await this.entitlement.getEffectivePlan(userId);
      limit = PLAN_FEATURES[plan].ai_calls_monthly;
      const peek = await this.counter.peek(userId, 'ai_calls_monthly', limit);
      if (!peek.allowed) throw new QuotaExceededError('ai_calls_monthly', limit, peek.resetAt);
    }

    const res = (await this.reportClient.generateSuggestions(auditId)) as {
      status: string;
      count: number;
      aiSuggestionsGeneratedAt: string;
    };

    if (res.status === 'disabled') {
      throw new ServiceUnavailableException('Tinh nang AI dang tat');
    }
    if (res.status === 'failed') {
      throw new BadGatewayException('Tao AI goi y that bai, thu lai sau');
    }

    let remaining: number | null = null;
    if (meter) {
      if (res.status === 'generated') {
        remaining = (await this.counter.consume(userId, 'ai_calls_monthly', limit, 1)).remaining;
      } else {
        remaining = (await this.counter.peek(userId, 'ai_calls_monthly', limit)).remaining;
      }
    }

    return { status: res.status, count: res.count, remaining };
  }
```

- [ ] **Step 4: Thêm endpoint controller**

Trong `audits.controller.ts`, thêm sau `detail` (`@Get(':id')`):
```ts
  @Post(':id/suggest')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PlanGuard)
  @RequireFeature(FeatureFlag.AI_SUGGESTIONS)
  @ApiOperation({ summary: 'Tao AI goi y theo yeu cau (tru 1 luot ai_calls_monthly)' })
  suggest(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.audits.suggest(user.id, user.role, id);
  }
```
(`Post`, `HttpCode`, `HttpStatus`, `UseGuards`, `PlanGuard`, `RequireFeature`, `FeatureFlag`, `ParseUUIDPipe` đã import sẵn.)

- [ ] **Step 5: Run — verify pass + build**

Run: `cd apps/gateway && npx vitest run test/unit/audits.service.spec.ts && npx tsc --noEmit`
Expected: PASS + type OK.

- [ ] **Step 6: Commit**
```bash
git add apps/gateway/src/audits/services/audits.service.ts apps/gateway/src/audits/controllers/audits.controller.ts apps/gateway/test/unit/audits.service.spec.ts
git commit -m "feat(gateway): POST /audits/:id/suggest with per-subscription ai_calls quota"
```

---

## Task 7: Web — API + hook

**Files:** Modify `apps/web/src/lib/api/audits.ts`, `apps/web/src/lib/queries/use-audits.ts`

- [ ] **Step 1: Thêm api function (cuối `audits.ts`)**
```ts
export interface SuggestAuditResponse {
  status: "generated" | "already" | "empty";
  count: number;
  remaining: number | null;
}

/**
 * `POST /audits/:id/suggest` — generate AI suggestions on demand. Consumes
 * 1 `ai_calls_monthly` lượt server-side (only on `generated`). 403 (no
 * feature) / 429 (quota) are handled globally by the api error interceptor.
 */
export async function suggestAudit(id: string): Promise<SuggestAuditResponse> {
  return api.post(`audits/${id}/suggest`).json<SuggestAuditResponse>();
}
```

- [ ] **Step 2: Thêm hook (cuối `use-audits.ts`)**

Thêm `suggestAudit`, `type SuggestAuditResponse` vào import từ `@/lib/api/audits`. Thêm:
```ts
/**
 * `POST /audits/:id/suggest` — on-demand AI suggestions. Invalidates the
 * detail query on success so the freshly persisted suggestions render under
 * failing rules. 403/429 bubble up; the global api error handler shows the
 * upgrade / quota modal.
 */
export function useSuggestAudit(auditId: string) {
  const queryClient = useQueryClient();
  return useMutation<SuggestAuditResponse, Error, void>({
    mutationFn: () => suggestAudit(auditId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audits.detail(auditId) });
    },
  });
}
```

- [ ] **Step 3: Build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: OK.

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/lib/api/audits.ts apps/web/src/lib/queries/use-audits.ts
git commit -m "feat(web): add suggestAudit api + useSuggestAudit hook"
```

---

## Task 8: Web — button + fix aiPending

**Files:** Modify `apps/web/src/components/audit-detail/completed-report.tsx`

- [ ] **Step 1: Thêm imports**
```ts
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FeatureFlag } from "@repo/shared";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";
import { useSuggestAudit } from "@/lib/queries/use-audits";
import { useSubscription } from "@/lib/queries/use-billing";
```
(Giữ các import hiện có; `Repeat`, `Button`, `Card`, `Badge` đã có.)

- [ ] **Step 2: Thay logic aiPending + thêm state generate trong `CompletedReport`**

Thay block tính `aiByRuleId` + `aiPending` bằng:
```ts
  const aiByRuleId = React.useMemo(() => {
    const map = new Map<string, ReportAiSuggestion>();
    for (const s of report.aiSuggestions ?? []) map.set(s.ruleId, s);
    return map;
  }, [report.aiSuggestions]);

  const hasGenerated = Boolean(report.aiSuggestionsGeneratedAt);
  const failingCount = React.useMemo(
    () =>
      report.ruleResults.filter((r) => {
        const s = protoCheckToRuleStatus(r.status);
        return s === "fail" || s === "warn";
      }).length,
    [report.ruleResults],
  );

  const subscription = useSubscription();
  const canUseAi =
    subscription.data?.isAdminGranted === true ||
    (subscription.data?.features.features ?? []).includes(FeatureFlag.AI_SUGGESTIONS);

  const suggestMutation = useSuggestAudit(audit.id);
  const generating = suggestMutation.isPending;

  const handleSuggest = () => {
    suggestMutation.mutate(undefined, {
      onError: (err) => {
        // 403/429 already surfaced by the global modal; toast covers the rest.
        if (!(err as { handledByModal?: boolean })?.handledByModal) {
          toast.error(err instanceof Error ? err.message : "Tao goi y that bai");
        }
      },
    });
  };
```
> Ghi chú: nếu interceptor đã nuốt 403/429 (modal), `onError` vẫn chạy — toast fallback chỉ cho lỗi khác. Nếu interceptor re-throw, giữ nguyên (toast hiển thị message tiếng Việt từ server). Chấp nhận double cho edge case hiếm.

- [ ] **Step 3: Thêm nút vào header của Card Rules**

Thay khối:
```tsx
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-ui text-lg font-semibold text-fg">{t("sections.rules")}</h3>
```
bằng:
```tsx
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-ui text-lg font-semibold text-fg">{t("sections.rules")}</h3>
          {failingCount > 0 && !hasGenerated && (
            <div className="flex items-center gap-2">
              {!canUseAi && (
                <Link href={ROUTES.pricing} className="text-xs text-accent hover:underline">
                  Nâng cấp Pro
                </Link>
              )}
              <span title={canUseAi ? undefined : "Nâng cấp Pro để dùng AI gợi ý"}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSuggest}
                  disabled={!canUseAi || generating}
                >
                  <Sparkles className={generating ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
                  {generating ? "Đang tạo gợi ý..." : "Tạo gợi ý AI"}
                </Button>
              </span>
            </div>
          )}
        </div>
```

- [ ] **Step 4: Cập nhật RuleDetail loading prop**

Trong JSX render `RuleDetail`, đổi `aiPending={aiPending}` → `aiPending={generating}`.
Giữ nguyên signature `RuleDetail` (prop `aiPending?: boolean`); giờ nó nghĩa là "đang generate". Card AI loading chỉ hiện khi mutation chạy:
- `RuleDetail` đã có: `{isFailing && (aiSuggestion || aiPending) && <AiSuggestionCard suggestion={aiSuggestion} status={aiPending && !aiSuggestion ? "loading" : "ready"} />}` — đúng hành vi mong muốn (loading chỉ khi generating + chưa có suggestion).

- [ ] **Step 5: Build + lint**

Run: `cd apps/web && npx tsc --noEmit`
Expected: OK.

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/components/audit-detail/completed-report.tsx
git commit -m "feat(web): on-demand 'Tạo gợi ý AI' button + fix perpetual loading"
```

---

## Task 9: Verify end-to-end (manual, no auto-run)

- [ ] **Step 1: Full typecheck + tests toàn repo (turbo)**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN" && npm run check-types && npm run test`
Expected: PASS (report + gateway unit tests xanh; web typecheck OK).

- [ ] **Step 2: Smoke build images không cần** — chỉ cần dịch vụ chạy local. Nếu chạy local: rebuild report + gateway dist (`npm run build --workspace=@seo/report --workspace=@seo/gateway`) rồi restart theo quy trình hiện có. Web: `npm run build` + restart (prod build).

- [ ] **Step 3: Manual check**
1. Tạo/mở 1 audit single đã completed có issue fail → KHÔNG còn card "AI đang phân tích..." tự hiện; thấy nút "Tạo gợi ý AI".
2. Click → nút loading → sau vài giây → card AI hiện dưới mỗi issue fail; nút biến mất.
3. User free (hoặc plan thiếu feature) → nút mờ + link "Nâng cấp Pro".
4. (nếu test được) hết lượt pro → click → modal quota.

---

## Self-Review Notes

- **Spec coverage:** auto-run off (T4) · sync gRPC (T1,T3,T5) · quota peek/consume-on-success (T6) · feature gate 403 + quota 429 (T6 + global FE modal) · idempotency lock (T2) · button + fix loading (T8) · tests (T2,T6) ✅
- **Type consistency:** `generateOnce` → `GenerateOutcome{status,suggestions,generatedAt}` dùng nhất quán T2→T3; gRPC wire camelCase `actionableFix`/`aiSuggestions`/`aiSuggestionsGeneratedAt` nhất quán T3↔T5; `suggest()` trả `{status,count,remaining}` nhất quán T6↔T7.
- **Known edge case:** billing OFF + user free non-admin → FE disable nút dù BE cho phép (dev-only). Chấp nhận; BE vẫn là source of truth.
- **Deviation:** giữ WS relay/handler `audit.suggestions.done` (dead, vô hại) để giảm blast radius — khác với spec (spec nói gỡ).

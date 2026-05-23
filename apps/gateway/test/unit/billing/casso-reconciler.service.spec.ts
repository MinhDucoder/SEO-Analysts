import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CassoReconcilerService } from '../../../src/billing/services/casso-reconciler.service';
import { PrismaService } from '../../../src/infra/prisma/prisma.service';
import { PaymentIntentService } from '../../../src/billing/services/payment-intent.service';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';
import { RedisService } from '../../../src/infra/redis/redis.service';

describe('CassoReconcilerService', () => {
  let svc: CassoReconcilerService;
  const events: any[] = [];
  const prismaMock = {
    cassoEvent: {
      create: vi.fn(async ({ data }: any) => {
        if (events.some((e) => e.cassoTxnId === data.cassoTxnId)) {
          const err: any = new Error('duplicate');
          err.code = 'P2002';
          throw err;
        }
        events.push({ id: `ev${events.length}`, ...data });
        return events[events.length - 1];
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const e = events.find((x) => x.id === where.id);
        Object.assign(e, data);
        return e;
      }),
    },
  };
  const intentSvc = {
    findByRefCode: vi.fn(),
    markPaid: vi.fn(),
  };
  const subSvc = {
    activate: vi.fn(async () => undefined),
    getCurrent: vi.fn(async () => ({ id: 'sub-new' })),
  };
  const redisMock = {
    client: { publish: vi.fn(async () => 1) },
  };

  beforeEach(() => {
    events.length = 0;
    vi.clearAllMocks();
    svc = new CassoReconcilerService(
      prismaMock as unknown as PrismaService,
      intentSvc as unknown as PaymentIntentService,
      subSvc as unknown as SubscriptionService,
      redisMock as unknown as RedisService,
    );
  });

  it('parses ref code from "noi dung chuyen khoan ... SEOABC23"', () => {
    expect((svc as any).extractRefCode('Tran tien SEOABC23 nha')).toBe('SEOABC23');
    expect((svc as any).extractRefCode('seoabc23 lowercase')).toBe('SEOABC23');
    expect((svc as any).extractRefCode('No code here')).toBeNull();
  });

  it('happy path: match + activate + publish', async () => {
    intentSvc.findByRefCode.mockResolvedValue({
      id: 'pi1', userId: 'u1', planCode: 'pro', amountVnd: 99_000, status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await svc.handleWebhook({
      tid: 'casso-tid-1',
      amount: 99_000,
      description: 'CK SEOABC23',
      when: '2026-05-20T12:00:00Z',
    });
    expect(subSvc.activate).toHaveBeenCalledWith({
      userId: 'u1', planCode: 'pro', paymentIntentId: 'pi1',
    });
    expect(intentSvc.markPaid).toHaveBeenCalledWith('pi1', 'casso-tid-1', 'sub-new');
    expect(redisMock.client.publish).toHaveBeenCalledWith(
      'billing.confirmed',
      expect.stringContaining('"intentId":"pi1"'),
    );
  });

  it('duplicate tid is idempotent (no activate twice)', async () => {
    intentSvc.findByRefCode.mockResolvedValue({
      id: 'pi1', userId: 'u1', planCode: 'pro', amountVnd: 99_000, status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const payload = { tid: 'casso-tid-1', amount: 99_000, description: 'CK SEOABC23', when: '...' };
    await svc.handleWebhook(payload);
    await svc.handleWebhook(payload);
    expect(subSvc.activate).toHaveBeenCalledTimes(1);
  });

  it('amount mismatch → unmatched, no activate', async () => {
    intentSvc.findByRefCode.mockResolvedValue({
      id: 'pi1', userId: 'u1', planCode: 'pro', amountVnd: 99_000, status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await svc.handleWebhook({
      tid: 'casso-tid-2', amount: 50_000, description: 'CK SEOABC23', when: '...',
    });
    expect(subSvc.activate).not.toHaveBeenCalled();
    expect(events[0].matched).toBe(false);
  });

  it('no ref code → unmatched', async () => {
    await svc.handleWebhook({ tid: 't3', amount: 99_000, description: 'just text', when: '...' });
    expect(intentSvc.findByRefCode).not.toHaveBeenCalled();
    expect(events[0].matched).toBe(false);
  });

  it('intent already paid → unmatched', async () => {
    intentSvc.findByRefCode.mockResolvedValue({
      id: 'pi1', userId: 'u1', planCode: 'pro', amountVnd: 99_000, status: 'paid',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await svc.handleWebhook({ tid: 't4', amount: 99_000, description: 'CK SEOABC23', when: '...' });
    expect(subSvc.activate).not.toHaveBeenCalled();
  });
});

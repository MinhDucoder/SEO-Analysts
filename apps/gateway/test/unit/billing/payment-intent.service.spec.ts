import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentIntentService } from '../../../src/billing/services/payment-intent.service';
import { PrismaService } from '../../../src/infra/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('PaymentIntentService', () => {
  let svc: PaymentIntentService;
  const intents: any[] = [];
  const prismaMock = {
    paymentIntent: {
      findFirst: vi.fn(async ({ where }: any) =>
        intents.find((i) => i.userId === where.userId && i.status === 'pending' && i.expiresAt > new Date()) ?? null,
      ),
      create: vi.fn(async ({ data }: any) => {
        const i = { id: `pi-${intents.length + 1}`, createdAt: new Date(), ...data };
        intents.push(i);
        return i;
      }),
      findUnique: vi.fn(async ({ where }: any) => intents.find((i) => i.id === where.id) ?? null),
    },
  };
  const configMock = {
    get: vi.fn((key: string) => ({
      VIETQR_BANK_BIN: '970423',
      VIETQR_ACCOUNT_NO: '17171777777',
      VIETQR_ACCOUNT_NAME: 'NGUYEN Minh Duc',
      BILLING_INTENT_TTL_MINUTES: '15',
    } as any)[key]),
  };

  beforeEach(() => {
    intents.length = 0;
    vi.clearAllMocks();
    svc = new PaymentIntentService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
    );
  });

  it('refCode matches /^SEO[A-Z2-7]{5}$/', () => {
    const code = (svc as any).generateRefCode() as string;
    expect(code).toMatch(/^SEO[A-Z2-7]{5}$/);
  });

  it('builds VietQR URL with amount and addInfo', () => {
    const url = (svc as any).buildVietQrUrl(99_000, 'SEOABC23') as string;
    expect(url).toContain('970422');
    expect(url).toContain('0123456789');
    expect(url).toContain('amount=99000');
    expect(url).toContain('addInfo=SEOABC23');
  });

  it('createIntent stores pending intent with TTL', async () => {
    const intent = await svc.createIntent('u1', 'pro', 99_000);
    expect(intent.status).toBe('pending');
    expect(intent.refCode).toMatch(/^SEO[A-Z2-7]{5}$/);
    const ttlMs = intent.expiresAt.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(29 * 60_000);
    expect(ttlMs).toBeLessThan(31 * 60_000);
  });

  it('createIntent returns existing pending intent instead of creating a duplicate', async () => {
    const first = await svc.createIntent('u1', 'pro', 99_000);
    const second = await svc.createIntent('u1', 'pro', 99_000);
    expect(second.id).toBe(first.id);
    expect(prismaMock.paymentIntent.create).toHaveBeenCalledTimes(1);
  });
});

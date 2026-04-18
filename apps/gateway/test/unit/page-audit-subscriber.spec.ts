import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PageAuditSubscriberService } from '../../src/audits/services/page-audit-subscriber.service';

describe('PageAuditSubscriberService', () => {
  let redis: { subscribe: ReturnType<typeof vi.fn> };
  let prisma: { pageAudit: { create: ReturnType<typeof vi.fn> } };
  let handler: (data: unknown) => void;
  let service: PageAuditSubscriberService;

  beforeEach(() => {
    handler = () => undefined;
    redis = {
      subscribe: vi.fn().mockImplementation(async (channel: string, h: (d: unknown) => void) => {
        if (channel === 'page-audit.done') handler = h;
      }),
    };
    prisma = {
      pageAudit: { create: vi.fn().mockResolvedValue({ id: 'pa-1' }) },
    };
    service = new PageAuditSubscriberService(redis as never, prisma as never);
  });

  const makePayload = (overrides: Record<string, unknown> = {}) => ({
    auditId: 'aud-1',
    result: {
      url: 'https://example.com/a',
      score: 72,
      issues: [{ ruleId: 'r1', ruleName: 'meta-title', status: 'pass', score: 100 }],
      fetchedAt: '2026-04-18T12:00:00.000Z',
      ...overrides,
    },
  });

  it('subscribes to the page-audit.done channel on init', async () => {
    await service.onModuleInit();
    expect(redis.subscribe).toHaveBeenCalledWith('page-audit.done', expect.any(Function));
  });

  it('persists a PageAudit row with mapped fields on a valid payload', async () => {
    await service.onModuleInit();
    await handler(makePayload());

    expect(prisma.pageAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        auditId: 'aud-1',
        url: 'https://example.com/a',
        score: 72,
        issues: expect.anything(),
        fetchedAt: expect.any(Date),
      }),
    });
    const call = prisma.pageAudit.create.mock.calls[0][0].data;
    expect(call.fetchedAt.toISOString()).toBe('2026-04-18T12:00:00.000Z');
  });

  it('silently skips payloads without auditId', async () => {
    await service.onModuleInit();
    await handler({ result: { url: 'x', score: 1, issues: [], fetchedAt: new Date().toISOString() } });
    expect(prisma.pageAudit.create).not.toHaveBeenCalled();
  });

  it('silently skips payloads without result object', async () => {
    await service.onModuleInit();
    await handler({ auditId: 'aud-x' });
    expect(prisma.pageAudit.create).not.toHaveBeenCalled();
  });

  it('silently skips payloads whose result is missing a URL', async () => {
    await service.onModuleInit();
    await handler({
      auditId: 'aud-1',
      result: { score: 50, issues: [], fetchedAt: '2026-04-18T12:00:00.000Z' },
    });
    expect(prisma.pageAudit.create).not.toHaveBeenCalled();
  });

  it('swallows persistence errors so the subscriber keeps running', async () => {
    prisma.pageAudit.create.mockRejectedValueOnce(new Error('fk violation'));
    await service.onModuleInit();
    await expect(handler(makePayload())).resolves.not.toThrow();
  });

  it('falls back to now() when fetchedAt is not a valid ISO date string', async () => {
    await service.onModuleInit();
    await handler(makePayload({ fetchedAt: 'not a date' }));
    const data = prisma.pageAudit.create.mock.calls[0][0].data;
    expect(data.fetchedAt).toBeInstanceOf(Date);
    expect(Number.isNaN(data.fetchedAt.getTime())).toBe(false);
  });

  it('persists failed results (score=0, error set) as regular rows', async () => {
    await service.onModuleInit();
    await handler(makePayload({ score: 0, issues: [], error: 'ECONNREFUSED' }));

    expect(prisma.pageAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ auditId: 'aud-1', score: 0 }),
    });
  });
});

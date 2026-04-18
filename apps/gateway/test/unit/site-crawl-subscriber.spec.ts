import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SiteCrawlSubscriberService } from '../../src/audits/services/site-crawl-subscriber.service';

describe('SiteCrawlSubscriberService', () => {
  let redis: {
    subscribe: ReturnType<typeof vi.fn>;
    client: { set: ReturnType<typeof vi.fn> };
  };
  let prisma: { audit: { update: ReturnType<typeof vi.fn> } };
  let gateway: {
    emitCompleted: ReturnType<typeof vi.fn>;
    emitProgress: ReturnType<typeof vi.fn>;
  };
  let handler: (data: unknown) => void;
  let service: SiteCrawlSubscriberService;

  beforeEach(() => {
    handler = () => undefined;
    redis = {
      subscribe: vi.fn().mockImplementation(async (channel: string, h: (d: unknown) => void) => {
        if (channel === 'site-crawl.done') handler = h;
      }),
      client: { set: vi.fn().mockResolvedValue('OK') },
    };
    prisma = { audit: { update: vi.fn().mockResolvedValue({ id: 'aud-1' }) } };
    gateway = { emitCompleted: vi.fn(), emitProgress: vi.fn() };
    service = new SiteCrawlSubscriberService(redis as never, prisma as never, gateway as never);
  });

  const makePayload = (overrides: Record<string, unknown> = {}) => ({
    auditId: 'aud-1',
    summary: {
      rootUrl: 'https://example.com/',
      totalUrls: 10,
      auditedUrls: 9,
      failedUrls: 1,
      avgScore: 74,
      medianScore: 78,
      worstPages: [
        { url: 'https://example.com/bad', score: 20, issueCount: 5 },
      ],
      ...overrides,
    },
  });

  it('subscribes to site-crawl.done on init', async () => {
    await service.onModuleInit();
    expect(redis.subscribe).toHaveBeenCalledWith('site-crawl.done', expect.any(Function));
  });

  it('finalizes the Audit row with aggregate fields when the audit completes', async () => {
    await service.onModuleInit();
    await handler(makePayload());

    expect(prisma.audit.update).toHaveBeenCalledWith({
      where: { id: 'aud-1' },
      data: expect.objectContaining({
        status: 'completed',
        seoScore: 74,
        auditedUrlsCount: 9,
        discoveredUrlsCount: 10,
        completedAt: expect.any(Date),
      }),
    });
  });

  it('caches the full summary in Redis so the detail endpoint can surface it', async () => {
    await service.onModuleInit();
    await handler(makePayload());

    expect(redis.client.set).toHaveBeenCalledWith(
      'audit:aud-1:site-summary',
      expect.any(String),
      'EX',
      3600,
    );
    const body = redis.client.set.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('site-summary'),
    )![1];
    expect(JSON.parse(body as string)).toMatchObject({ rootUrl: 'https://example.com/', avgScore: 74 });
  });

  it('sets audit:<id>:progress to 100 so polling endpoints see completion', async () => {
    await service.onModuleInit();
    await handler(makePayload());

    expect(redis.client.set).toHaveBeenCalledWith(
      'audit:aud-1:progress',
      '100',
      'EX',
      3600,
    );
  });

  it('emits audit:completed via the WebSocket gateway with the summary payload', async () => {
    await service.onModuleInit();
    await handler(makePayload());

    expect(gateway.emitCompleted).toHaveBeenCalledWith(
      'aud-1',
      expect.objectContaining({
        auditId: 'aud-1',
        finalScore: 74,
        summary: expect.objectContaining({ rootUrl: 'https://example.com/' }),
      }),
    );
  });

  it('silently skips payloads without auditId', async () => {
    await service.onModuleInit();
    await handler({ summary: { avgScore: 1 } });
    expect(prisma.audit.update).not.toHaveBeenCalled();
  });

  it('silently skips payloads without summary', async () => {
    await service.onModuleInit();
    await handler({ auditId: 'aud-x' });
    expect(prisma.audit.update).not.toHaveBeenCalled();
  });

  it('handles Prisma update errors without crashing the subscriber', async () => {
    prisma.audit.update.mockRejectedValueOnce(new Error('audit missing'));
    await service.onModuleInit();
    await expect(handler(makePayload())).resolves.not.toThrow();
  });
});

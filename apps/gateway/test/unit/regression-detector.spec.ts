import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegressionDetectorService } from '../../src/scheduled-audits/services/regression-detector.service';

describe('RegressionDetectorService', () => {
  let redis: {
    subscribe: ReturnType<typeof vi.fn>;
    client: { get: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    scheduledAudit: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    auditAlert: { create: ReturnType<typeof vi.fn> };
  };
  let handlers: Record<string, (data: unknown) => void>;
  let service: RegressionDetectorService;

  beforeEach(() => {
    handlers = {};
    redis = {
      subscribe: vi.fn().mockImplementation(async (ch: string, h: (d: unknown) => void) => {
        handlers[ch] = h;
      }),
      client: { get: vi.fn().mockResolvedValue(null) },
    };
    prisma = {
      scheduledAudit: {
        findUnique: vi.fn().mockResolvedValue({ id: 'sch-1', lastScore: null }),
        update: vi.fn().mockResolvedValue({}),
      },
      auditAlert: { create: vi.fn().mockResolvedValue({ id: 'alert-1' }) },
    };
    service = new RegressionDetectorService(redis as never, prisma as never);
  });

  it('subscribes to report.done and site-crawl.done', async () => {
    await service.onModuleInit();
    expect(redis.subscribe).toHaveBeenCalledWith('report.done', expect.any(Function));
    expect(redis.subscribe).toHaveBeenCalledWith('site-crawl.done', expect.any(Function));
  });

  it('ignores completions that are not tied to a schedule', async () => {
    await service.onModuleInit();
    redis.client.get.mockResolvedValueOnce(null); // no schedule map

    await handlers['report.done']!({ auditId: 'aud-1', finalScore: 80 });

    expect(prisma.scheduledAudit.findUnique).not.toHaveBeenCalled();
    expect(prisma.auditAlert.create).not.toHaveBeenCalled();
  });

  it('updates ScheduledAudit.lastScore on every completion', async () => {
    redis.client.get.mockResolvedValueOnce('sch-1');
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce({ id: 'sch-1', lastScore: 85 });

    await service.onModuleInit();
    await handlers['report.done']!({ auditId: 'aud-1', finalScore: 80 });

    expect(prisma.scheduledAudit.update).toHaveBeenCalledWith({
      where: { id: 'sch-1' },
      data: { lastScore: 80 },
    });
  });

  it('does NOT alert when score change is below the threshold', async () => {
    redis.client.get.mockResolvedValueOnce('sch-1');
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce({ id: 'sch-1', lastScore: 85 });

    await service.onModuleInit();
    await handlers['report.done']!({ auditId: 'aud-1', finalScore: 80 });

    expect(prisma.auditAlert.create).not.toHaveBeenCalled();
  });

  it('emits a score_drop alert when drop ≥ SCORE_DROP_THRESHOLD', async () => {
    redis.client.get.mockResolvedValueOnce('sch-1');
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce({ id: 'sch-1', lastScore: 85 });

    await service.onModuleInit();
    await handlers['report.done']!({ auditId: 'aud-1', finalScore: 70 });

    expect(prisma.auditAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        auditId: 'aud-1',
        scheduleId: 'sch-1',
        type: 'score_drop',
        deltaScore: 15,
      }),
    });
  });

  it('emits a site_down alert when the score is zero regardless of previous baseline', async () => {
    redis.client.get.mockResolvedValueOnce('sch-1');
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce({ id: 'sch-1', lastScore: 80 });

    await service.onModuleInit();
    await handlers['report.done']!({ auditId: 'aud-1', finalScore: 0 });

    expect(prisma.auditAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'site_down' }),
    });
  });

  it('reads site-mode scores from summary.avgScore instead of finalScore', async () => {
    redis.client.get.mockResolvedValueOnce('sch-1');
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce({ id: 'sch-1', lastScore: 80 });

    await service.onModuleInit();
    await handlers['site-crawl.done']!({
      auditId: 'aud-1',
      summary: { avgScore: 60 },
    });

    expect(prisma.scheduledAudit.update).toHaveBeenCalledWith({
      where: { id: 'sch-1' },
      data: { lastScore: 60 },
    });
    expect(prisma.auditAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'score_drop', deltaScore: 20 }),
    });
  });

  it('skips silently when no score is present on the completion payload', async () => {
    redis.client.get.mockResolvedValueOnce('sch-1');

    await service.onModuleInit();
    await handlers['report.done']!({ auditId: 'aud-1' });

    expect(prisma.scheduledAudit.update).not.toHaveBeenCalled();
  });
});

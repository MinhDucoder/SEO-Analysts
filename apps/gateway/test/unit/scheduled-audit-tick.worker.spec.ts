import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScheduledAuditTickWorker } from '../../src/scheduled-audits/controllers/scheduled-audit-tick.worker';
import { AuditMode } from '@repo/shared';

const makeJob = (data: unknown) => ({ id: 'job-1', data } as never);

describe('ScheduledAuditTickWorker', () => {
  let prisma: {
    scheduledAudit: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    audit: { create: ReturnType<typeof vi.fn> };
  };
  let redis: { client: { set: ReturnType<typeof vi.fn> } };
  let producer: {
    enqueueCrawlStart: ReturnType<typeof vi.fn>;
    enqueueSiteCrawlStart: ReturnType<typeof vi.fn>;
  };
  let worker: ScheduledAuditTickWorker;

  beforeEach(() => {
    prisma = {
      scheduledAudit: {
        findUnique: vi.fn().mockResolvedValue({ id: 'sch-1', isActive: true }),
        update: vi.fn().mockResolvedValue({}),
      },
      audit: { create: vi.fn().mockResolvedValue({ id: 'aud-1', status: 'pending' }) },
    };
    redis = { client: { set: vi.fn().mockResolvedValue('OK') } };
    producer = {
      enqueueCrawlStart: vi.fn().mockResolvedValue(undefined),
      enqueueSiteCrawlStart: vi.fn().mockResolvedValue(undefined),
    };
    worker = new ScheduledAuditTickWorker(prisma as never, redis as never, producer as never);
  });

  const baseJob = {
    scheduleId: 'sch-1',
    userId: 'user-1',
    url: 'https://example.com/',
    mode: AuditMode.SINGLE,
  };

  it('creates an Audit row owned by the schedule user + enqueues crawl.start', async () => {
    await worker.process(makeJob(baseJob));

    expect(prisma.audit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        url: 'https://example.com/',
        mode: 'single',
      }),
    });
    expect(producer.enqueueCrawlStart).toHaveBeenCalledWith({
      auditId: 'aud-1',
      url: 'https://example.com/',
      options: { targetKeyword: undefined },
    });
    expect(producer.enqueueSiteCrawlStart).not.toHaveBeenCalled();
  });

  it('routes site-mode ticks through enqueueSiteCrawlStart', async () => {
    await worker.process(makeJob({ ...baseJob, mode: AuditMode.SITE, maxUrls: 250 }));

    expect(producer.enqueueSiteCrawlStart).toHaveBeenCalledWith({
      auditId: 'aud-1',
      rootUrl: 'https://example.com/',
      maxUrls: 250,
      targetKeyword: undefined,
    });
    expect(producer.enqueueCrawlStart).not.toHaveBeenCalled();
  });

  it('writes the audit->schedule map to Redis so the regression detector can look it up', async () => {
    await worker.process(makeJob(baseJob));
    expect(redis.client.set).toHaveBeenCalledWith(
      'audit:aud-1:schedule',
      'sch-1',
      'EX',
      expect.any(Number),
    );
  });

  it('updates ScheduledAudit.lastRunAt immediately so the UI reflects the tick', async () => {
    await worker.process(makeJob(baseJob));
    expect(prisma.scheduledAudit.update).toHaveBeenCalledWith({
      where: { id: 'sch-1' },
      data: { lastRunAt: expect.any(Date) },
    });
  });

  it('drops ticks for deleted schedules', async () => {
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce(null);
    await worker.process(makeJob(baseJob));

    expect(prisma.audit.create).not.toHaveBeenCalled();
    expect(producer.enqueueCrawlStart).not.toHaveBeenCalled();
  });

  it('drops ticks for paused schedules (isActive=false)', async () => {
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce({ id: 'sch-1', isActive: false });
    await worker.process(makeJob(baseJob));
    expect(prisma.audit.create).not.toHaveBeenCalled();
  });

  it('aborts gracefully when the schedule URL is malformed (skip enqueue, no crash)', async () => {
    await worker.process(makeJob({ ...baseJob, url: 'not a url' }));
    expect(prisma.audit.create).not.toHaveBeenCalled();
    expect(producer.enqueueCrawlStart).not.toHaveBeenCalled();
  });
});

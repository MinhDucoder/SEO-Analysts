import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScheduledAuditScheduler } from '../../src/scheduled-audits/services/scheduled-audit-scheduler.service';
import { AuditMode } from '@repo/shared';

describe('ScheduledAuditScheduler', () => {
  let queue: {
    upsertJobScheduler: ReturnType<typeof vi.fn>;
    removeJobScheduler: ReturnType<typeof vi.fn>;
  };
  let scheduler: ScheduledAuditScheduler;

  beforeEach(() => {
    queue = {
      upsertJobScheduler: vi.fn().mockResolvedValue({ id: 'x' }),
      removeJobScheduler: vi.fn().mockResolvedValue(undefined),
    };
    scheduler = new ScheduledAuditScheduler(queue as never);
  });

  it('upsert uses a composite sched:<userId>:<scheduleId> key', async () => {
    await scheduler.upsert({
      scheduleId: 'sch-1',
      userId: 'user-1',
      url: 'https://x/',
      cron: '0 9 * * MON',
      mode: AuditMode.SINGLE,
    });

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'sched:user-1:sch-1',
      { pattern: '0 9 * * MON' },
      expect.objectContaining({
        name: 'scheduled-audit.tick',
        data: expect.objectContaining({ scheduleId: 'sch-1', userId: 'user-1' }),
      }),
    );
  });

  it('upsert carries maxUrls + targetKeyword + mode into the job data', async () => {
    await scheduler.upsert({
      scheduleId: 'sch-2',
      userId: 'u',
      url: 'https://x/',
      cron: '*/15 * * * *',
      mode: AuditMode.SITE,
      maxUrls: 300,
      targetKeyword: 'seo',
    });

    const call = queue.upsertJobScheduler.mock.calls[0][2];
    expect(call.data.mode).toBe('site');
    expect(call.data.maxUrls).toBe(300);
    expect(call.data.targetKeyword).toBe('seo');
  });

  it('remove uses the same composite key pattern', async () => {
    await scheduler.remove('user-9', 'sch-9');
    expect(queue.removeJobScheduler).toHaveBeenCalledWith('sched:user-9:sch-9');
  });
});

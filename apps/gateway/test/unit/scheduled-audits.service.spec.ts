import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScheduledAuditsService } from '../../src/scheduled-audits/services/scheduled-audits.service';
import { AuditModeDto } from '../../src/audits/dto/create-audit.dto';

vi.mock('../../src/common/utils/url-validator', () => ({
  validateUrlSafety: vi.fn().mockResolvedValue({ href: 'https://example.com/', domain: 'example.com' }),
}));

describe('ScheduledAuditsService', () => {
  const prisma = {
    scheduledAudit: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  const scheduler = {
    upsert: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  let svc: ScheduledAuditsService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new ScheduledAuditsService(prisma as never, scheduler as never);
  });

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'sch-1',
    userId: 'user-1',
    url: 'https://example.com/',
    cron: '0 9 * * MON',
    mode: 'single',
    maxUrls: null,
    targetKeyword: null,
    lastRunAt: null,
    lastScore: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it('create writes a ScheduledAudit row and upserts the scheduler', async () => {
    prisma.scheduledAudit.create.mockResolvedValueOnce(row());

    const out = await svc.create('user-1', {
      url: 'https://example.com',
      cron: '0 9 * * MON',
    });

    expect(prisma.scheduledAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        url: 'https://example.com/',
        cron: '0 9 * * MON',
        mode: 'single',
      }),
    });
    expect(scheduler.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ scheduleId: 'sch-1', userId: 'user-1', cron: '0 9 * * MON' }),
    );
    expect(out.id).toBe('sch-1');
  });

  it('create with mode=site persists mode=site and forwards maxUrls to the scheduler', async () => {
    prisma.scheduledAudit.create.mockResolvedValueOnce(row({ mode: 'site', maxUrls: 250 }));

    await svc.create('user-1', {
      url: 'https://example.com',
      cron: '0 9 * * *',
      mode: AuditModeDto.SITE,
      maxUrls: 250,
    });

    expect(prisma.scheduledAudit.create.mock.calls[0][0].data.mode).toBe('site');
    expect(scheduler.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'site', maxUrls: 250 }),
    );
  });

  it('list returns only the current user rows', async () => {
    prisma.scheduledAudit.findMany.mockResolvedValueOnce([row(), row({ id: 'sch-2' })]);
    const out = await svc.list('user-1');
    expect(prisma.scheduledAudit.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(out).toHaveLength(2);
  });

  it('get throws Forbidden when schedule belongs to another user', async () => {
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce(row({ userId: 'other' }));
    await expect(svc.get('user-1', 'sch-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('get throws NotFound when schedule missing', async () => {
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce(null);
    await expect(svc.get('user-1', 'sch-x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('toggle(false) updates row and removes the scheduler', async () => {
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce(row());
    prisma.scheduledAudit.update.mockResolvedValueOnce(row({ isActive: false }));

    await svc.toggle('user-1', 'sch-1', false);

    expect(prisma.scheduledAudit.update).toHaveBeenCalledWith({
      where: { id: 'sch-1' },
      data: { isActive: false },
    });
    expect(scheduler.remove).toHaveBeenCalledWith('user-1', 'sch-1');
    expect(scheduler.upsert).not.toHaveBeenCalled();
  });

  it('toggle(true) updates row and upserts the scheduler', async () => {
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce(row({ isActive: false }));
    prisma.scheduledAudit.update.mockResolvedValueOnce(row({ isActive: true }));

    await svc.toggle('user-1', 'sch-1', true);

    expect(scheduler.upsert).toHaveBeenCalled();
    expect(scheduler.remove).not.toHaveBeenCalled();
  });

  it('delete removes both the DB row and the scheduler entry', async () => {
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce(row());
    prisma.scheduledAudit.delete.mockResolvedValueOnce(undefined);

    await svc.delete('user-1', 'sch-1');

    expect(prisma.scheduledAudit.delete).toHaveBeenCalledWith({ where: { id: 'sch-1' } });
    expect(scheduler.remove).toHaveBeenCalledWith('user-1', 'sch-1');
  });

  it('delete tolerates scheduler.remove errors (row is already gone)', async () => {
    prisma.scheduledAudit.findUnique.mockResolvedValueOnce(row());
    scheduler.remove.mockRejectedValueOnce(new Error('scheduler gone'));
    await expect(svc.delete('user-1', 'sch-1')).resolves.not.toThrow();
  });

  it('onModuleInit re-registers every active schedule with the scheduler', async () => {
    prisma.scheduledAudit.findMany.mockResolvedValueOnce([row(), row({ id: 'sch-2' })]);
    await svc.onModuleInit();
    expect(scheduler.upsert).toHaveBeenCalledTimes(2);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditsService } from '../../src/audits/services/audits.service';
import { AuditStatus, UserRole } from '@repo/shared';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

vi.mock('../../src/common/utils/url-validator', () => ({
  validateUrlSafety: vi.fn().mockResolvedValue({ href: 'https://example.com/', domain: 'example.com' }),
}));

describe('AuditsService', () => {
  let svc: AuditsService;
  const prisma = {
    audit: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      delete: vi.fn(),
    },
  };
  const rl = {
    consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, retryAfterSeconds: 0 }),
    auditBucket: (u: string) => `audit:${u}`,
  };
  const redis = {
    client: {
      get: vi.fn().mockResolvedValue(null),
    },
  };
  const producer = {
    enqueueCrawlStart: vi.fn(),
    enqueueSiteCrawlStart: vi.fn(),
  };
  const reportClient = { getReport: vi.fn().mockRejectedValue(new Error('down')) };
  const entitlement = {
    hasFeature: vi.fn().mockResolvedValue({ allowed: true, code: 'OK', reason: '' }),
    checkSiteAuditPageCount: vi.fn().mockResolvedValue({ allowed: true, code: 'OK', reason: '' }),
    getEffectivePlan: vi.fn().mockResolvedValue('business'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AuditsService(
      prisma as never,
      rl as never,
      redis as never,
      producer as never,
      reportClient as never,
      entitlement as never,
    );
  });

  it('createAudit blocks when rate limit hit', async () => {
    rl.consume.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 120 });
    await expect(
      svc.createAudit('u1', { url: 'https://example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createAudit creates pending row + enqueues crawl.start', async () => {
    prisma.audit.create.mockResolvedValueOnce({
      id: 'a1', status: AuditStatus.PENDING, userId: 'u1', url: 'https://example.com/',
    });
    const out = await svc.createAudit('u1', { url: 'https://example.com', targetKeyword: 'foo' });
    expect(out.auditId).toBe('a1');
    expect(out.status).toBe(AuditStatus.PENDING);
    expect(producer.enqueueCrawlStart).toHaveBeenCalledWith({
      auditId: 'a1',
      url: 'https://example.com/',
      options: { targetKeyword: 'foo' },
    });
  });

  it('getAuditDetail returns audit even when report service is down', async () => {
    prisma.audit.findUnique.mockResolvedValueOnce({
      id: 'a1', userId: 'u1', url: 'x', domain: 'd', status: AuditStatus.COMPLETED, seoScore: null,
      targetKeyword: null, crawlerType: 'cheerio', crawlDurationMs: 1000, createdAt: new Date(),
      completedAt: new Date(), errorMessage: null,
    });
    const out = await svc.getAuditDetail('u1', UserRole.USER, 'a1');
    expect(out.audit.id).toBe('a1');
    expect(out.report).toBeNull();
  });

  it('getAuditDetail forbids non-owner non-admin', async () => {
    prisma.audit.findUnique.mockResolvedValueOnce({ id: 'a1', userId: 'other' });
    await expect(svc.getAuditDetail('u1', UserRole.USER, 'a1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deleteAudit refuses while crawling', async () => {
    prisma.audit.findUnique.mockResolvedValueOnce({
      id: 'a1', userId: 'u1', status: AuditStatus.CRAWLING,
    });
    await expect(svc.deleteAudit('u1', UserRole.USER, 'a1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteAudit 404 when missing', async () => {
    prisma.audit.findUnique.mockResolvedValueOnce(null);
    await expect(svc.deleteAudit('u1', UserRole.USER, 'a1')).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('site-mode routing', () => {
    it('creates Audit with mode=site and enqueues site-crawl.start when mode=site', async () => {
      prisma.audit.create.mockResolvedValueOnce({
        id: 'a2', status: AuditStatus.PENDING, userId: 'u1', url: 'https://example.com/',
      });

      await svc.createAudit('u1', { url: 'https://example.com', mode: 'site' });

      const createArgs = prisma.audit.create.mock.calls[0][0];
      expect(createArgs.data.mode).toBe('site');
      expect(producer.enqueueSiteCrawlStart).toHaveBeenCalledWith({
        auditId: 'a2',
        rootUrl: 'https://example.com/',
        maxUrls: undefined,
        targetKeyword: undefined,
      });
      expect(producer.enqueueCrawlStart).not.toHaveBeenCalled();
    });

    it('forwards maxUrls + targetKeyword to the site-crawl producer', async () => {
      prisma.audit.create.mockResolvedValueOnce({
        id: 'a3', status: AuditStatus.PENDING, userId: 'u1', url: 'https://example.com/',
      });

      await svc.createAudit('u1', {
        url: 'https://example.com',
        mode: 'site',
        maxUrls: 250,
        targetKeyword: 'best widgets',
      });

      expect(producer.enqueueSiteCrawlStart).toHaveBeenCalledWith({
        auditId: 'a3',
        rootUrl: 'https://example.com/',
        maxUrls: 250,
        targetKeyword: 'best widgets',
      });
    });

    it('defaults to mode=single when mode is absent (existing behaviour)', async () => {
      prisma.audit.create.mockResolvedValueOnce({
        id: 'a4', status: AuditStatus.PENDING, userId: 'u1', url: 'https://example.com/',
      });

      await svc.createAudit('u1', { url: 'https://example.com' });

      const createArgs = prisma.audit.create.mock.calls[0][0];
      expect(createArgs.data.mode).toBe('single');
      expect(producer.enqueueCrawlStart).toHaveBeenCalled();
      expect(producer.enqueueSiteCrawlStart).not.toHaveBeenCalled();
    });

    it('rejects maxUrls that exceed the hard cap', async () => {
      await expect(
        svc.createAudit('u1', { url: 'https://example.com', mode: 'site', maxUrls: 10_000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.audit.create).not.toHaveBeenCalled();
    });
  });
});

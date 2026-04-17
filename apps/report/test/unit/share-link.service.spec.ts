import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ShareLinkService } from '../../src/report/services/share-link.service';

const prismaMock: any = {
  shareLink: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  report: { findUnique: vi.fn() },
};

describe('ShareLinkService', () => {
  let service: ShareLinkService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ShareLinkService(prismaMock);
  });

  it('creates a 64-char hex token via crypto.randomBytes(32)', async () => {
    prismaMock.report.findUnique.mockResolvedValueOnce({ id: 'rep-1', auditId: 'aud-1' });
    prismaMock.shareLink.create.mockResolvedValueOnce({ token: '0'.repeat(64), reportId: 'rep-1' });
    const result = await service.create('aud-1');
    expect(prismaMock.shareLink.create).toHaveBeenCalledOnce();
    const callArg = prismaMock.shareLink.create.mock.calls[0][0].data;
    expect(callArg.token).toMatch(/^[0-9a-f]{64}$/);
    expect(result.token).toHaveLength(64);
  });

  it('throws when audit has no report', async () => {
    prismaMock.report.findUnique.mockResolvedValueOnce(null);
    await expect(service.create('aud-missing')).rejects.toThrow(/report not found/i);
  });

  it('lookup increments accessedCount and sets lastAccessedAt', async () => {
    prismaMock.shareLink.findFirst.mockResolvedValueOnce({
      id: 'sl-1',
      reportId: 'rep-1',
      token: 'tok',
      isActive: true,
    });
    prismaMock.shareLink.update.mockResolvedValueOnce({});
    const link = await service.findActiveByToken('tok');
    expect(link?.id).toBe('sl-1');
    expect(prismaMock.shareLink.update).toHaveBeenCalledWith({
      where: { id: 'sl-1' },
      data: expect.objectContaining({
        accessedCount: { increment: 1 },
        lastAccessedAt: expect.any(Date),
      }),
    });
  });

  it('lookup returns null for inactive or unknown token', async () => {
    prismaMock.shareLink.findFirst.mockResolvedValueOnce(null);
    expect(await service.findActiveByToken('nope')).toBeNull();
  });

  it('revoke marks all share links for the audit inactive', async () => {
    prismaMock.shareLink.update.mockResolvedValueOnce({ id: 'sl-1', isActive: false });
    prismaMock.report.findUnique.mockResolvedValueOnce({ id: 'rep-1' });
    const ok = await service.revoke('aud-1');
    expect(ok).toBe(true);
    expect(prismaMock.shareLink.update).toHaveBeenCalled();
  });
});

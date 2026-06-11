import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ReportGrpcController } from '../../src/report/controllers/report.grpc.controller';

/**
 * Regression guard for the share-link 404 bug: `createShareLink` must build a
 * URL pointing at the web frontend (`/shared/:token` Next.js page), never the
 * gateway (port 3000 has no `/shared/:token` route → "Cannot GET /shared/...").
 */
describe('ReportGrpcController.createShareLink — shareUrl host', () => {
  const shareLinkMock: any = { create: vi.fn() };
  let controller: ReportGrpcController;
  const ORIGINAL_FRONTEND_URL = process.env.FRONTEND_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    shareLinkMock.create.mockResolvedValue({ token: 'a'.repeat(64) });
    controller = new ReportGrpcController({} as any, {} as any, shareLinkMock, {} as any);
  });

  afterEach(() => {
    if (ORIGINAL_FRONTEND_URL === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = ORIGINAL_FRONTEND_URL;
  });

  it('uses FRONTEND_URL as the base when set', async () => {
    process.env.FRONTEND_URL = 'https://app.example.com';
    const res = await controller.createShareLink({ auditId: 'aud-1' });
    expect(res.shareUrl).toBe(`https://app.example.com/shared/${'a'.repeat(64)}`);
  });

  it('defaults to the web port 3001, never the gateway port 3000', async () => {
    delete process.env.FRONTEND_URL;
    const res = await controller.createShareLink({ auditId: 'aud-1' });
    expect(res.shareUrl).toBe(`http://localhost:3001/shared/${'a'.repeat(64)}`);
    expect(res.shareUrl).not.toContain(':3000');
  });

  it('returns the token alongside the url', async () => {
    const res = await controller.createShareLink({ auditId: 'aud-1' });
    expect(res.shareToken).toBe('a'.repeat(64));
  });
});

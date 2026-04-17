import { describe, expect, it, beforeEach, vi } from 'vitest';
import { WaitForBothService } from '../../src/report/services/wait-for-both.service';

const redisCmd = {
  setex: vi.fn(),
  incr: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
};
const redisService: any = { client: () => redisCmd };
const queueAdd = vi.fn();
const reportQueue: any = { add: queueAdd };

describe('WaitForBothService', () => {
  let svc: WaitForBothService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new WaitForBothService(redisService, reportQueue);
  });

  it('stores analyze payload + INCR + does NOT enqueue when count = 1', async () => {
    redisCmd.incr.mockResolvedValueOnce(1);
    await svc.recordAnalyzeDone('aud-1', { foo: 'bar' });
    expect(redisCmd.setex).toHaveBeenCalledWith(
      'audit:aud-1:analyze_result',
      3600,
      JSON.stringify({ foo: 'bar' }),
    );
    expect(redisCmd.incr).toHaveBeenCalledWith('audit:aud-1:completed_steps');
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('enqueues report.start when count = 2 after recordKeywordDone', async () => {
    redisCmd.incr.mockResolvedValueOnce(2);
    await svc.recordKeywordDone('aud-1', { keywords: [] });
    expect(redisCmd.setex).toHaveBeenCalledWith(
      'audit:aud-1:keyword_result',
      3600,
      JSON.stringify({ keywords: [] }),
    );
    expect(queueAdd).toHaveBeenCalledWith('report.start', { auditId: 'aud-1' }, expect.any(Object));
  });

  it('reads stored payloads and parses JSON', async () => {
    redisCmd.get
      .mockResolvedValueOnce(JSON.stringify({ overallScore: 80 }))
      .mockResolvedValueOnce(JSON.stringify({ keywords: [{ keyword: 'seo' }] }));
    const both = await svc.readBoth('aud-1');
    expect(both.analyze).toEqual({ overallScore: 80 });
    expect(both.keywords).toEqual({ keywords: [{ keyword: 'seo' }] });
  });

  it('readBoth throws when payloads missing', async () => {
    redisCmd.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(svc.readBoth('aud-1')).rejects.toThrow(/missing/i);
  });

  it('cleanup deletes all 3 keys', async () => {
    await svc.cleanup('aud-1');
    expect(redisCmd.del).toHaveBeenCalledWith(
      'audit:aud-1:analyze_result',
      'audit:aud-1:keyword_result',
      'audit:aud-1:completed_steps',
    );
  });
});

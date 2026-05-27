import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Job } from 'bullmq';
import { KeywordWorker } from '../../src/keyword/controllers/keyword.worker';
import { KeywordAnalyzerService } from '../../src/keyword/services/keyword-analyzer.service';
import { EventPublisher } from '../../src/keyword/services/event.publisher';

const jobData = {
  auditId: 'a1',
  url: 'https://example.com',
  textContent: 'seo content here',
  title: 'Title',
  h1Text: 'H1',
  metaDescription: 'desc',
  targetKeyword: 'seo',
  language: 'en',
};

const makeJob = (data = jobData) => ({ id: 'job-1', data }) as unknown as Job;

describe('KeywordWorker', () => {
  let worker: KeywordWorker;
  const analyzer = { analyze: vi.fn() } as unknown as KeywordAnalyzerService;
  const events = { cacheResult: vi.fn(), publishDone: vi.fn() } as unknown as EventPublisher;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new KeywordWorker(analyzer, events);
  });

  it('analyzes, caches the result, then publishes keyword.done success', async () => {
    const result = { auditId: 'a1', density: [] };
    (analyzer.analyze as any).mockResolvedValue(result);

    await worker.process(makeJob());

    expect(analyzer.analyze).toHaveBeenCalledWith({
      auditId: 'a1',
      url: 'https://example.com',
      textContent: 'seo content here',
      title: 'Title',
      h1Text: 'H1',
      metaDescription: 'desc',
      targetKeyword: 'seo',
      language: 'en',
    });
    expect(events.cacheResult).toHaveBeenCalledWith('a1', result);
    expect(events.publishDone).toHaveBeenCalledWith({ auditId: 'a1', status: 'success' });
  });

  it('publishes a failed keyword.done and rethrows so BullMQ can retry', async () => {
    (analyzer.analyze as any).mockRejectedValue(new Error('tokenizer blew up'));

    await expect(worker.process(makeJob())).rejects.toThrow('tokenizer blew up');

    expect(events.cacheResult).not.toHaveBeenCalled();
    expect(events.publishDone).toHaveBeenCalledWith({
      auditId: 'a1',
      status: 'failed',
      error: 'tokenizer blew up',
    });
  });

  it('still publishes keyword.done (so the report counter never stalls) on non-Error throws', async () => {
    (analyzer.analyze as any).mockRejectedValue('string failure');

    await expect(worker.process(makeJob())).rejects.toBe('string failure');
    expect(events.publishDone).toHaveBeenCalledWith({
      auditId: 'a1',
      status: 'failed',
      error: 'string failure',
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CACHE_TTL, REDIS_KEYS } from '@repo/shared';
import { AnalyzeDoneListener } from '../../src/report/controllers/analyze-done.listener';
import { KeywordDoneListener } from '../../src/report/controllers/keyword-done.listener';
import { CrawlDoneListener } from '../../src/report/controllers/crawl-done.listener';

/**
 * The three Redis pub/sub listeners that feed report choreography. Each
 * subscribes on init and registers a single `message` handler; the tests
 * pull that handler out of the `on` mock and drive it through its branches
 * (wrong channel, missing auditId, malformed JSON, happy path).
 */
function makeRedis() {
  const sub = { subscribe: vi.fn(), on: vi.fn(), unsubscribe: vi.fn() };
  const cmd = { setex: vi.fn() };
  const redis: any = { subscriber: vi.fn(() => sub), client: vi.fn(() => cmd) };
  return { redis, sub, cmd };
}

/** Pulls the registered `message` callback out of the subscriber mock. */
function messageHandler(sub: { on: any }) {
  const call = sub.on.mock.calls.find((c: unknown[]) => c[0] === 'message');
  return call?.[1] as (channel: string, raw: string) => Promise<void>;
}

describe('AnalyzeDoneListener', () => {
  let waitSvc: any;
  let redisCtx: ReturnType<typeof makeRedis>;
  let listener: AnalyzeDoneListener;

  beforeEach(async () => {
    vi.clearAllMocks();
    waitSvc = { recordAnalyzeDone: vi.fn(), recordKeywordDone: vi.fn() };
    redisCtx = makeRedis();
    listener = new AnalyzeDoneListener(redisCtx.redis, waitSvc);
    await listener.onModuleInit();
  });

  it('subscribes to the analyze.done channel on init', () => {
    expect(redisCtx.sub.subscribe).toHaveBeenCalledWith('analyze.done');
  });

  it('records analyze.done in the wait service for a well-formed event', async () => {
    const handler = messageHandler(redisCtx.sub);
    await handler('analyze.done', JSON.stringify({ auditId: 'a1', score: 88 }));
    expect(waitSvc.recordAnalyzeDone).toHaveBeenCalledWith('a1', { auditId: 'a1', score: 88 });
  });

  it('ignores messages on a different channel', async () => {
    const handler = messageHandler(redisCtx.sub);
    await handler('keyword.done', JSON.stringify({ auditId: 'a1' }));
    expect(waitSvc.recordAnalyzeDone).not.toHaveBeenCalled();
  });

  it('skips events missing an auditId', async () => {
    const handler = messageHandler(redisCtx.sub);
    await handler('analyze.done', JSON.stringify({ score: 1 }));
    expect(waitSvc.recordAnalyzeDone).not.toHaveBeenCalled();
  });

  it('swallows malformed JSON without throwing', async () => {
    const handler = messageHandler(redisCtx.sub);
    await expect(handler('analyze.done', '{not-json')).resolves.toBeUndefined();
    expect(waitSvc.recordAnalyzeDone).not.toHaveBeenCalled();
  });

  it('unsubscribes on destroy', async () => {
    await listener.onModuleDestroy();
    expect(redisCtx.sub.unsubscribe).toHaveBeenCalledWith('analyze.done');
  });
});

describe('KeywordDoneListener', () => {
  let waitSvc: any;
  let redisCtx: ReturnType<typeof makeRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    waitSvc = { recordKeywordDone: vi.fn() };
    redisCtx = makeRedis();
  });

  it('subscribes to keyword.done and records well-formed events', async () => {
    const listener = new KeywordDoneListener(redisCtx.redis, waitSvc);
    await listener.onModuleInit();
    expect(redisCtx.sub.subscribe).toHaveBeenCalledWith('keyword.done');

    const handler = messageHandler(redisCtx.sub);
    await handler('keyword.done', JSON.stringify({ auditId: 'a2' }));
    expect(waitSvc.recordKeywordDone).toHaveBeenCalledWith('a2', { auditId: 'a2' });
  });

  it('skips events without an auditId', async () => {
    const listener = new KeywordDoneListener(redisCtx.redis, waitSvc);
    await listener.onModuleInit();
    const handler = messageHandler(redisCtx.sub);
    await handler('keyword.done', JSON.stringify({}));
    expect(waitSvc.recordKeywordDone).not.toHaveBeenCalled();
  });
});

describe('CrawlDoneListener', () => {
  let redisCtx: ReturnType<typeof makeRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    redisCtx = makeRedis();
  });

  it('caches the raw crawl payload under the audit crawl-result key with the result TTL', async () => {
    const listener = new CrawlDoneListener(redisCtx.redis);
    await listener.onModuleInit();
    expect(redisCtx.sub.subscribe).toHaveBeenCalledWith('crawl.done');

    const handler = messageHandler(redisCtx.sub);
    const raw = JSON.stringify({ auditId: 'a3', cwv: { mobile: {}, desktop: {} } });
    await handler('crawl.done', raw);

    expect(redisCtx.cmd.setex).toHaveBeenCalledWith(
      REDIS_KEYS.auditCrawlResult('a3'),
      CACHE_TTL.AUDIT_RESULT_SECONDS,
      raw,
    );
  });

  it('does not cache an event missing an auditId', async () => {
    const listener = new CrawlDoneListener(redisCtx.redis);
    await listener.onModuleInit();
    const handler = messageHandler(redisCtx.sub);
    await handler('crawl.done', JSON.stringify({ cwv: {} }));
    expect(redisCtx.cmd.setex).not.toHaveBeenCalled();
  });
});

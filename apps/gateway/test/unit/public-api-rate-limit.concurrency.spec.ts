import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicApiRateLimitService } from '../../src/public-api/services/public-api-rate-limit.service';

describe('PublicApiRateLimitService concurrency bucket', () => {
  let redisClient: {
    incr: ReturnType<typeof vi.fn>;
    decr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
  };
  let svc: PublicApiRateLimitService;

  beforeEach(() => {
    redisClient = {
      incr: vi.fn().mockResolvedValue(1),
      decr: vi.fn().mockResolvedValue(0),
      expire: vi.fn().mockResolvedValue(1),
    };
    const rl = { consume: vi.fn() } as never;
    const redis = { client: redisClient } as never;
    svc = new PublicApiRateLimitService(rl, redis);
  });

  it('acquireConcurrency returns true below cap and increments counter', async () => {
    redisClient.incr.mockResolvedValueOnce(1);
    const ok = await svc.acquireConcurrency('key-1');
    expect(ok).toBe(true);
    expect(redisClient.incr).toHaveBeenCalledWith('rl:pubcheck:concur:key-1');
    expect(redisClient.expire).toHaveBeenCalledWith('rl:pubcheck:concur:key-1', 30);
  });

  it('acquireConcurrency returns false at or above cap and decrements back', async () => {
    redisClient.incr.mockResolvedValueOnce(6);
    const ok = await svc.acquireConcurrency('key-1');
    expect(ok).toBe(false);
    expect(redisClient.decr).toHaveBeenCalledWith('rl:pubcheck:concur:key-1');
  });

  it('releaseConcurrency decrements', async () => {
    redisClient.decr.mockResolvedValueOnce(-1);
    await svc.releaseConcurrency('key-1');
    expect(redisClient.decr).toHaveBeenCalledWith('rl:pubcheck:concur:key-1');
  });
});

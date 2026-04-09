import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiterService } from '../../src/redis/rate-limiter.service';
import { RedisService } from '../../src/redis/redis.service';

class FakeRedis {
  store = new Map<string, Array<{ score: number; member: string }>>();
  multi() {
    const ops: Array<() => unknown> = [];
    const store = this.store;
    const chain = {
      zremrangebyscore(key: string, min: number, max: number) {
        ops.push(() => {
          const arr = store.get(key) ?? [];
          store.set(key, arr.filter((e) => e.score < min || e.score > max));
        });
        return chain;
      },
      zcard(key: string) {
        ops.push(() => (store.get(key) ?? []).length);
        return chain;
      },
      zadd(key: string, score: number, member: string) {
        ops.push(() => {
          const arr = store.get(key) ?? [];
          arr.push({ score, member });
          store.set(key, arr);
        });
        return chain;
      },
      expire() {
        ops.push(() => 1);
        return chain;
      },
      async exec() {
        return ops.map((fn) => [null, fn()]);
      },
    };
    return chain;
  }
  async zrem(key: string, member: string) {
    const arr = this.store.get(key) ?? [];
    this.store.set(key, arr.filter((e) => e.member !== member));
    return 1;
  }
  async zrange(key: string, start: number, stop: number, _withScores?: string) {
    const arr = (this.store.get(key) ?? []).slice().sort((a, b) => a.score - b.score);
    const slice = arr.slice(start, stop + 1);
    return slice.flatMap((e) => [e.member, String(e.score)]);
  }
}

describe('RateLimiterService', () => {
  let svc: RateLimiterService;
  let fake: FakeRedis;

  beforeEach(() => {
    fake = new FakeRedis();
    svc = new RateLimiterService({ client: fake } as unknown as RedisService);
  });

  it('allows up to limit then blocks', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await svc.consume('test', 3, 60);
      expect(r.allowed).toBe(true);
    }
    const fourth = await svc.consume('test', 3, 60);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('reports remaining count correctly', async () => {
    const r1 = await svc.consume('k', 5, 60);
    expect(r1.remaining).toBe(4);
    const r2 = await svc.consume('k', 5, 60);
    expect(r2.remaining).toBe(3);
  });
});

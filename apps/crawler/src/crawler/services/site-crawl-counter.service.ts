/**
 * @file Redis INCR-based fan-in counter for F1 site-wide crawl.
 * The start worker calls `setExpected(auditId, N)` once; each
 * url-audit worker calls `markDone(auditId)` on completion and
 * receives the current count back. When count === expected, the
 * caller publishes `site-crawl.done`. Keys expire after 1 h as a
 * safety net in case a stuck audit never reaches N.
 */
import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../persistence/cache.service';

const EXPIRE_SECONDS = 3600;

@Injectable()
export class SiteCrawlCounter {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Record the total number of URL-audit jobs fanned out for `auditId`. */
  async setExpected(auditId: string, expected: number): Promise<void> {
    await this.redis.setex(this.expectedKey(auditId), EXPIRE_SECONDS, String(expected));
  }

  async getExpected(auditId: string): Promise<number | null> {
    const raw = await this.redis.get(this.expectedKey(auditId));
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  /** Atomically increment the done counter and return (done, expected). */
  async markDone(auditId: string): Promise<{ done: number; expected: number | null; complete: boolean }> {
    const [done, expectedRaw] = await Promise.all([
      this.redis.incr(this.doneKey(auditId)),
      this.redis.get(this.expectedKey(auditId)),
    ]);
    await this.redis.expire(this.doneKey(auditId), EXPIRE_SECONDS);
    const expected = expectedRaw === null ? null : Number(expectedRaw);
    const complete = expected !== null && Number.isFinite(expected) && done >= expected;
    return { done, expected, complete };
  }

  /** Delete both counters after the aggregate worker finishes. */
  async cleanup(auditId: string): Promise<void> {
    await this.redis.del(this.expectedKey(auditId), this.doneKey(auditId));
  }

  private expectedKey(auditId: string): string {
    return `site-crawl:${auditId}:expected`;
  }

  private doneKey(auditId: string): string {
    return `site-crawl:${auditId}:done`;
  }
}

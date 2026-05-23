import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpiryCron } from '../../../src/billing/services/expiry.cron';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';

describe('ExpiryCron', () => {
  let cron: ExpiryCron;
  const sub = { downgradeExpiredToFree: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    cron = new ExpiryCron(sub);
  });

  it('handleDaily calls downgradeExpiredToFree', async () => {
    sub.downgradeExpiredToFree.mockResolvedValue(3);
    await cron.handleDaily();
    expect(sub.downgradeExpiredToFree).toHaveBeenCalledTimes(1);
  });
});

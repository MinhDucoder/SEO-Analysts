import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BrowserPool } from '../../src/crawler/infra/fetchers/browser-pool';

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

import { chromium } from 'playwright';

const fakeContext = { close: vi.fn().mockResolvedValue(undefined) };
const fakeBrowser = {
  newContext: vi.fn().mockResolvedValue(fakeContext),
  close: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(true),
};

describe('BrowserPool', () => {
  let pool: BrowserPool;

  beforeEach(() => {
    vi.clearAllMocks();
    fakeBrowser.newContext.mockResolvedValue(fakeContext);
    fakeBrowser.isConnected.mockReturnValue(true);
    (chromium.launch as any).mockResolvedValue(fakeBrowser);
    pool = new BrowserPool(2);
  });

  afterEach(async () => {
    await pool.shutdown();
  });

  it('launches a browser on first acquire', async () => {
    const ctx = await pool.acquire();
    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(fakeBrowser.newContext).toHaveBeenCalledTimes(1);
    expect(ctx).toBe(fakeContext);
  });

  it('reuses an existing browser when available', async () => {
    const a = await pool.acquire();
    await pool.release(a);
    const b = await pool.acquire();
    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(b).toBe(fakeContext);
  });

  it('respects maxSize and creates up to max browsers', async () => {
    await pool.acquire();
    await pool.acquire();
    expect(chromium.launch).toHaveBeenCalledTimes(2);
  });

  it('queues acquire calls when pool is saturated', async () => {
    const a = await pool.acquire();
    const b = await pool.acquire();
    let resolvedThird = false;
    const third = pool.acquire().then((ctx) => {
      resolvedThird = true;
      return ctx;
    });
    // Briefly yield — third must still be pending
    await new Promise((r) => setImmediate(r));
    expect(resolvedThird).toBe(false);

    await pool.release(a);
    const ctx = await third;
    expect(resolvedThird).toBe(true);
    expect(ctx).toBeDefined();

    await pool.release(b);
    await pool.release(ctx);
  });

  it('shutdown closes all browsers', async () => {
    await pool.acquire();
    await pool.acquire();
    await pool.shutdown();
    expect(fakeBrowser.close).toHaveBeenCalled();
  });
});

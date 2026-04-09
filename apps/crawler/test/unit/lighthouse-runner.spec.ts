import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockLaunch = vi.fn();
vi.mock('chrome-launcher', () => ({
  launch: (...args: unknown[]) => mockLaunch(...args),
}));

const mockLighthouse = vi.fn();
vi.mock('lighthouse', () => ({
  default: (...args: unknown[]) => mockLighthouse(...args),
}));

import { LighthouseRunner } from '../../src/crawler/lighthouse-runner';
import { CacheService } from '../../src/crawler/cache.service';

describe('LighthouseRunner', () => {
  let runner: LighthouseRunner;
  const fakeChrome = { port: 9222, kill: vi.fn().mockResolvedValue(undefined) };
  const cacheGet = vi.fn();
  const cacheSet = vi.fn();
  const cache = { getLighthouse: cacheGet, setLighthouse: cacheSet } as unknown as CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLaunch.mockResolvedValue(fakeChrome);
    cacheGet.mockResolvedValue(null);
    runner = new LighthouseRunner(cache);
  });

  it('returns cached result when present and skips lighthouse call', async () => {
    cacheGet.mockResolvedValueOnce({
      lcpMs: 1200,
      inpMs: 100,
      cls: 0.05,
      performanceScore: 95,
      accessibilityScore: 90,
      bestPracticesScore: 88,
      seoScore: 92,
    });

    const result = await runner.run('https://example.com/');
    expect(result.cwv.lcpMs).toBe(1200);
    expect(result.cached).toBe(true);
    expect(mockLighthouse).not.toHaveBeenCalled();
    expect(mockLaunch).not.toHaveBeenCalled();
  });

  it('runs lighthouse on cache miss and writes result to cache', async () => {
    mockLighthouse.mockResolvedValueOnce({
      lhr: {
        audits: {
          'largest-contentful-paint': { numericValue: 2100 },
          'interaction-to-next-paint': { numericValue: 180 },
          'cumulative-layout-shift': { numericValue: 0.08 },
        },
        categories: {
          performance: { score: 0.87 },
          accessibility: { score: 0.92 },
          'best-practices': { score: 0.95 },
          seo: { score: 0.9 },
        },
      },
    });

    const result = await runner.run('https://example.com/');

    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ chromeFlags: expect.arrayContaining(['--headless']) }),
    );
    expect(mockLighthouse).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({ port: 9222, output: 'json' }),
      expect.objectContaining({ extends: 'lighthouse:default' }),
    );
    expect(result.cwv.lcpMs).toBe(2100);
    expect(result.cwv.inpMs).toBe(180);
    expect(result.cwv.cls).toBeCloseTo(0.08);
    expect(result.cwv.performanceScore).toBe(87);
    expect(result.cwv.accessibilityScore).toBe(92);
    expect(result.cwv.bestPracticesScore).toBe(95);
    expect(result.cwv.seoScore).toBe(90);
    expect(result.cached).toBe(false);
    expect(cacheSet).toHaveBeenCalledWith('https://example.com/', expect.objectContaining({ lcpMs: 2100 }));
    expect(fakeChrome.kill).toHaveBeenCalled();
  });

  it('kills chrome even when lighthouse throws', async () => {
    mockLighthouse.mockRejectedValueOnce(new Error('lh boom'));
    await expect(runner.run('https://example.com/')).rejects.toThrow('lh boom');
    expect(fakeChrome.kill).toHaveBeenCalled();
  });
});

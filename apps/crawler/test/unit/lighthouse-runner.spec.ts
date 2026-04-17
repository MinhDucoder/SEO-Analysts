import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockLaunch = vi.fn();
vi.mock('chrome-launcher', () => ({
  launch: (...args: unknown[]) => mockLaunch(...args),
}));

const mockLighthouse = vi.fn();
vi.mock('lighthouse', () => ({
  default: (...args: unknown[]) => mockLighthouse(...args),
}));

import { LighthouseRunner } from '../../src/crawler/services/lighthouse-runner';
import { CacheService } from '../../src/crawler/persistence/cache.service';

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
    expect(cacheSet).toHaveBeenCalledWith('https://example.com/', 'mobile', expect.objectContaining({ lcpMs: 2100 }));
    expect(fakeChrome.kill).toHaveBeenCalled();
  });

  it('kills chrome even when lighthouse throws', async () => {
    mockLighthouse.mockRejectedValueOnce(new Error('lh boom'));
    await expect(runner.run('https://example.com/')).rejects.toThrow('lh boom');
    expect(fakeChrome.kill).toHaveBeenCalled();
  });

  it('passes preset=desktop in the Lighthouse config for desktop form factor', async () => {
    mockLighthouse.mockResolvedValueOnce({
      lhr: {
        audits: { 'largest-contentful-paint': { numericValue: 800 }, 'interaction-to-next-paint': { numericValue: 50 }, 'cumulative-layout-shift': { numericValue: 0.01 } },
        categories: { performance: { score: 0.98 }, accessibility: { score: 0.95 }, 'best-practices': { score: 0.97 }, seo: { score: 0.99 } },
      },
    });
    await runner.run('https://example.com/', 'desktop' as any);
    const lhConfig = mockLighthouse.mock.calls[0][2];
    expect(lhConfig).toEqual(expect.objectContaining({
      extends: 'lighthouse:default',
      settings: expect.objectContaining({ preset: 'desktop' }),
    }));
  });

  it('does not pass desktop preset for mobile form factor (default)', async () => {
    mockLighthouse.mockResolvedValueOnce({
      lhr: {
        audits: { 'largest-contentful-paint': { numericValue: 2100 }, 'interaction-to-next-paint': { numericValue: 180 }, 'cumulative-layout-shift': { numericValue: 0.08 } },
        categories: { performance: { score: 0.87 }, accessibility: { score: 0.92 }, 'best-practices': { score: 0.95 }, seo: { score: 0.9 } },
      },
    });
    await runner.run('https://example.com/');
    const lhConfig = mockLighthouse.mock.calls[0][2];
    expect(lhConfig.settings).toBeUndefined();
  });

  it('looks up cache per-formFactor so mobile and desktop never collide', async () => {
    cacheGet.mockImplementation((_url: string, ff?: string) => {
      if (ff === 'desktop') return Promise.resolve({ lcpMs: 999, inpMs: 0, cls: 0, performanceScore: 50, accessibilityScore: 0, bestPracticesScore: 0, seoScore: 0 });
      return Promise.resolve(null);
    });
    mockLighthouse.mockResolvedValueOnce({
      lhr: {
        audits: { 'largest-contentful-paint': { numericValue: 1800 }, 'interaction-to-next-paint': { numericValue: 90 }, 'cumulative-layout-shift': { numericValue: 0.03 } },
        categories: { performance: { score: 0.8 }, accessibility: { score: 0.8 }, 'best-practices': { score: 0.8 }, seo: { score: 0.8 } },
      },
    });
    const mobile  = await runner.run('https://example.com/', 'mobile' as any);
    const desktop = await runner.run('https://example.com/', 'desktop' as any);
    expect(mobile.cached).toBe(false);
    expect(desktop.cached).toBe(true);
    expect(desktop.cwv.lcpMs).toBe(999);
  });

  describe('runBoth', () => {
    const lhResponse = {
      lhr: {
        audits: { 'largest-contentful-paint': { numericValue: 1500 }, 'interaction-to-next-paint': { numericValue: 100 }, 'cumulative-layout-shift': { numericValue: 0.04 } },
        categories: { performance: { score: 0.9 }, accessibility: { score: 0.9 }, 'best-practices': { score: 0.9 }, seo: { score: 0.9 } },
      },
    };

    it('returns both mobile and desktop results with correct formFactor', async () => {
      mockLighthouse.mockResolvedValue(lhResponse);
      const result = await runner.runBoth('https://example.com/');
      expect(result.mobile.formFactor).toBe('mobile');
      expect(result.desktop.formFactor).toBe('desktop');
      expect(mockLighthouse).toHaveBeenCalledTimes(2);
    });

    it('invokes Lighthouse twice in sequential mode (LIGHTHOUSE_PARALLEL unset)', async () => {
      delete process.env.LIGHTHOUSE_PARALLEL;
      mockLighthouse.mockResolvedValue(lhResponse);
      const result = await runner.runBoth('https://example.com/');
      expect(mockLighthouse).toHaveBeenCalledTimes(2);
      expect(result.mobile.cwv.performanceScore).toBe(90);
      expect(result.desktop.cwv.performanceScore).toBe(90);
    });

    it('invokes Lighthouse twice in parallel mode (LIGHTHOUSE_PARALLEL=true)', async () => {
      process.env.LIGHTHOUSE_PARALLEL = 'true';
      mockLighthouse.mockResolvedValue(lhResponse);
      const result = await runner.runBoth('https://example.com/');
      expect(mockLighthouse).toHaveBeenCalledTimes(2);
      expect(result.mobile.formFactor).toBe('mobile');
      expect(result.desktop.formFactor).toBe('desktop');
      delete process.env.LIGHTHOUSE_PARALLEL;
    });
  });
});

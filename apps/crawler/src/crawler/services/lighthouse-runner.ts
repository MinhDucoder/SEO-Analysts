import { Injectable, Logger } from '@nestjs/common';
import { CoreWebVitals } from '@repo/shared';
import { CacheService } from '../persistence/cache.service';

export interface LighthouseRunResult {
  cwv: CoreWebVitals;
  cached: boolean;
  durationMs: number;
}

@Injectable()
export class LighthouseRunner {
  private readonly logger = new Logger(LighthouseRunner.name);

  constructor(private readonly cache: CacheService) {}

  async run(url: string): Promise<LighthouseRunResult> {
    const cachedHit = await this.cache.getLighthouse<CoreWebVitals>(url);
    if (cachedHit) {
      return { cwv: cachedHit, cached: true, durationMs: 0 };
    }

    const start = Date.now();
    const { launch } = await import('chrome-launcher');
    const chrome = await launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    try {
      const lighthouseModule = await import('lighthouse');
      type LighthouseFn = (url: string, flags: Record<string, unknown>, config?: Record<string, unknown>) => Promise<unknown>;
      const lighthouse = (lighthouseModule as unknown as { default: LighthouseFn }).default;
      const runnerResult = await lighthouse(
        url,
        {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
        { extends: 'lighthouse:default' },
      );

      const lhr = (runnerResult as { lhr: any }).lhr;
      const cwv: CoreWebVitals = {
        lcpMs: Number(lhr.audits['largest-contentful-paint']?.numericValue ?? 0),
        inpMs: Number(
          lhr.audits['interaction-to-next-paint']?.numericValue ??
            lhr.audits['interactive']?.numericValue ??
            0,
        ),
        cls: Number(lhr.audits['cumulative-layout-shift']?.numericValue ?? 0),
        performanceScore: Math.round((lhr.categories.performance?.score ?? 0) * 100),
        accessibilityScore: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
        bestPracticesScore: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
        seoScore: Math.round((lhr.categories.seo?.score ?? 0) * 100),
      };

      await this.cache.setLighthouse(url, cwv);
      return { cwv, cached: false, durationMs: Date.now() - start };
    } finally {
      try {
        await chrome.kill();
      } catch (err) {
        this.logger.warn(`Failed killing chrome: ${(err as Error).message}`);
      }
    }
  }
}

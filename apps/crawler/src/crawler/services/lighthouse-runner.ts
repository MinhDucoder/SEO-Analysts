/**
 * @file Runs Google Lighthouse and projects its JSON output onto our
 * `CoreWebVitals` shape. Expensive (5-30 s) — results cached in Redis
 * with longer TTL than the crawl cache. Supports both mobile and
 * desktop form factors; mobile is the default (matches Google's
 * mobile-first indexing). `runBoth()` executes both runs sequentially
 * unless the `LIGHTHOUSE_PARALLEL` env flag is set.
 */
import { Injectable, Logger } from '@nestjs/common';
import { CoreWebVitals, FormFactor } from '@repo/shared';
import { CacheService } from '../persistence/cache.service';

export interface LighthouseRunResult {
  cwv: CoreWebVitals;
  cached: boolean;
  durationMs: number;
  formFactor: FormFactor;
}

export interface DualLighthouseRunResult {
  mobile: LighthouseRunResult;
  desktop: LighthouseRunResult;
}

@Injectable()
export class LighthouseRunner {
  private readonly logger = new Logger(LighthouseRunner.name);

  constructor(private readonly cache: CacheService) {}

  /**
   * Return CWV metrics for `url` under the given `formFactor`. Chrome
   * is always killed in `finally` so a Lighthouse crash cannot leak
   * headless processes.
   */
  async run(url: string, formFactor: FormFactor = FormFactor.MOBILE): Promise<LighthouseRunResult> {
    const cachedHit = await this.cache.getLighthouse<CoreWebVitals>(url, formFactor);
    if (cachedHit) {
      return { cwv: cachedHit, cached: true, durationMs: 0, formFactor };
    }

    const start = Date.now();
    const { launch } = await import('chrome-launcher');
    // chrome-launcher cannot auto-discover Chrome inside the Playwright base
    // image — browsers live under /ms-playwright (PLAYWRIGHT_BROWSERS_PATH),
    // not on PATH — so it throws "CHROME_PATH must be set" and CWV silently
    // zero out. Point it at Playwright's bundled Chromium (version-independent,
    // no hardcoded revision dir). An explicit CHROME_PATH still wins so ops
    // can override with a system Chrome.
    const { chromium } = await import('playwright');
    const chrome = await launch({
      chromePath: process.env.CHROME_PATH || chromium.executablePath(),
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    try {
      const lighthouseModule = await import('lighthouse');
      type LighthouseFn = (url: string, flags: Record<string, unknown>, config?: Record<string, unknown>) => Promise<unknown>;
      const lighthouse = (lighthouseModule as unknown as { default: LighthouseFn }).default;
      const config: Record<string, unknown> = { extends: 'lighthouse:default' };
      if (formFactor === FormFactor.DESKTOP) {
        config.settings = { preset: 'desktop' };
      }
      const runnerResult = await lighthouse(
        url,
        {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
        config,
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

      await this.cache.setLighthouse(url, formFactor, cwv);
      return { cwv, cached: false, durationMs: Date.now() - start, formFactor };
    } finally {
      try {
        await chrome.kill();
      } catch (err) {
        this.logger.warn(`Failed killing chrome: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Run Lighthouse once per form factor. Default sequential to cap
   * peak RAM at a single run (~300-600 MB). Parallel mode is opt-in
   * via `LIGHTHOUSE_PARALLEL=true` for environments with ≥1.5 GB RAM.
   */
  async runBoth(url: string): Promise<DualLighthouseRunResult> {
    const parallel = process.env.LIGHTHOUSE_PARALLEL === 'true';
    if (parallel) {
      const [mobile, desktop] = await Promise.all([
        this.run(url, FormFactor.MOBILE),
        this.run(url, FormFactor.DESKTOP),
      ]);
      return { mobile, desktop };
    }
    const mobile = await this.run(url, FormFactor.MOBILE);
    const desktop = await this.run(url, FormFactor.DESKTOP);
    return { mobile, desktop };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';

export interface LighthouseResult {
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  metrics: {
    lcp: number | null;
    cls: number | null;
    inp: number | null;
    ttfb: number | null;
  };
  cwvEvaluation: {
    lcp: 'good' | 'needs-improvement' | 'poor' | null;
    cls: 'good' | 'needs-improvement' | 'poor' | null;
    inp: 'good' | 'needs-improvement' | 'poor' | null;
    ttfb: 'good' | 'needs-improvement' | 'poor' | null;
  };
  available: boolean;
}

@Injectable()
export class LighthouseService {
  private readonly logger = new Logger(LighthouseService.name);

  async analyze(url: string): Promise<LighthouseResult> {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const port = (browser as any)._initializer?.userDataDir
        ? undefined
        : this.getCdpPort(browser);

      // Dynamic import for lighthouse (ESM)
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const lighthouse = await (Function(
        'return import("lighthouse")',
      )() as Promise<any>);
      const lh = lighthouse.default || lighthouse;

      const result = await Promise.race([
        lh(url, {
          port,
          output: 'json',
          onlyCategories: [
            'performance',
            'accessibility',
            'best-practices',
            'seo',
          ],
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Lighthouse timeout')), 60000),
        ),
      ]);

      const categories = result.lhr.categories;
      const audits = result.lhr.audits;

      const lcp = audits['largest-contentful-paint']?.numericValue || null;
      const cls = audits['cumulative-layout-shift']?.numericValue || null;
      const ttfb = audits['server-response-time']?.numericValue || null;
      const inp = audits['interaction-to-next-paint']?.numericValue || null;

      return {
        performanceScore: Math.round(
          (categories.performance?.score || 0) * 100,
        ),
        accessibilityScore: Math.round(
          (categories.accessibility?.score || 0) * 100,
        ),
        bestPracticesScore: Math.round(
          (categories['best-practices']?.score || 0) * 100,
        ),
        seoScore: Math.round((categories.seo?.score || 0) * 100),
        metrics: { lcp, cls, inp, ttfb },
        cwvEvaluation: {
          lcp: this.evaluateLcp(lcp),
          cls: this.evaluateCls(cls),
          inp: this.evaluateInp(inp),
          ttfb: this.evaluateTtfb(ttfb),
        },
        available: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Lighthouse analysis failed for ${url}: ${message}`);
      return this.unavailableResult();
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private getCdpPort(browser: any): number | undefined {
    try {
      const wsEndpoint = browser.wsEndpoint();
      const url = new URL(wsEndpoint);
      return parseInt(url.port, 10);
    } catch {
      return undefined;
    }
  }

  private evaluateLcp(
    value: number | null,
  ): 'good' | 'needs-improvement' | 'poor' | null {
    if (value === null) return null;
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private evaluateCls(
    value: number | null,
  ): 'good' | 'needs-improvement' | 'poor' | null {
    if (value === null) return null;
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private evaluateInp(
    value: number | null,
  ): 'good' | 'needs-improvement' | 'poor' | null {
    if (value === null) return null;
    if (value <= 200) return 'good';
    if (value <= 500) return 'needs-improvement';
    return 'poor';
  }

  private evaluateTtfb(
    value: number | null,
  ): 'good' | 'needs-improvement' | 'poor' | null {
    if (value === null) return null;
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  private unavailableResult(): LighthouseResult {
    return {
      performanceScore: 0,
      accessibilityScore: 0,
      bestPracticesScore: 0,
      seoScore: 0,
      metrics: { lcp: null, cls: null, inp: null, ttfb: null },
      cwvEvaluation: { lcp: null, cls: null, inp: null, ttfb: null },
      available: false,
    };
  }
}

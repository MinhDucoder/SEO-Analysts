import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Browser, BrowserContext, chromium } from 'playwright';

interface PoolEntry {
  browser: Browser;
  inUse: boolean;
}

@Injectable()
export class BrowserPool implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserPool.name);
  private readonly entries: PoolEntry[] = [];
  private readonly waiters: Array<(entry: PoolEntry) => void> = [];

  constructor(private readonly maxSize: number = 3) {}

  async acquire(): Promise<BrowserContext> {
    const entry = await this.acquireEntry();
    const context = await entry.browser.newContext({
      userAgent: 'SEOAnalystBot/1.0 (+https://seo-analyst.local)',
      ignoreHTTPSErrors: false,
    });
    // Tag context with its owning entry so release() can find it
    (context as unknown as { __poolEntry: PoolEntry }).__poolEntry = entry;
    return context;
  }

  async release(context: BrowserContext): Promise<void> {
    const tagged = context as unknown as { __poolEntry?: PoolEntry };
    try {
      await context.close();
    } catch (err) {
      this.logger.warn(`Failed closing context: ${(err as Error).message}`);
    }
    const entry = tagged.__poolEntry;
    if (!entry) return;
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()!;
      next(entry); // hand off without flipping inUse
      return;
    }
    entry.inUse = false;
  }

  async shutdown(): Promise<void> {
    this.waiters.length = 0;
    for (const entry of this.entries) {
      try {
        await entry.browser.close();
      } catch (err) {
        this.logger.warn(`Failed closing browser: ${(err as Error).message}`);
      }
    }
    this.entries.length = 0;
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  private async acquireEntry(): Promise<PoolEntry> {
    // Look for an idle entry
    const idle = this.entries.find((e) => !e.inUse && e.browser.isConnected());
    if (idle) {
      idle.inUse = true;
      return idle;
    }

    // Capacity available → spin up a new browser
    if (this.entries.length < this.maxSize) {
      const browser = await chromium.launch({ headless: true });
      const entry: PoolEntry = { browser, inUse: true };
      this.entries.push(entry);
      return entry;
    }

    // Pool saturated → wait for a release
    return new Promise<PoolEntry>((resolve) => {
      this.waiters.push((entry) => {
        entry.inUse = true;
        resolve(entry);
      });
    });
  }
}

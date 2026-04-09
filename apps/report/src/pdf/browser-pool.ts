import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Browser, chromium } from 'playwright';

@Injectable()
export class BrowserPool implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserPool.name);
  private readonly POOL_SIZE = 2;
  private browsers: Browser[] = [];
  private cursor = 0;

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    for (let i = 0; i < this.POOL_SIZE; i += 1) {
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
      this.browsers.push(browser);
    }
    this.logger.log(`browser pool ready (size=${this.POOL_SIZE})`);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.browsers.map((b) => b.close()));
    this.browsers = [];
  }

  acquire(): Browser {
    if (this.browsers.length === 0) {
      throw new Error('BrowserPool not initialized');
    }
    const browser = this.browsers[this.cursor % this.browsers.length]!;
    this.cursor += 1;
    return browser;
  }
}

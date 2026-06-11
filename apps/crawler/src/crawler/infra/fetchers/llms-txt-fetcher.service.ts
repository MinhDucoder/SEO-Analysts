import { Injectable, Logger } from '@nestjs/common';

export interface LlmsTxtResult {
  url: string;
  status: number;
  h1?: string;
  summary?: string;
  sectionCount: number;
  sizeBytes: number;
}

@Injectable()
export class LlmsTxtFetcherService {
  private readonly logger = new Logger(LlmsTxtFetcherService.name);
  private readonly TIMEOUT_MS = 5000;

  async fetch(siteRoot: string): Promise<LlmsTxtResult> {
    const url = new URL('/llms.txt', siteRoot).toString();
    const ctrl = new AbortController();
    const timerId = setTimeout(() => ctrl.abort(), this.TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        return { url, status: res.status, sectionCount: 0, sizeBytes: 0 };
      }
      const body = await res.text();
      return {
        url,
        status: res.status,
        h1: this.extractH1(body),
        summary: this.extractBlockquote(body),
        sectionCount: this.countH2(body),
        sizeBytes: body.length,
      };
    } catch (err) {
      this.logger.warn(`llms.txt fetch failed for ${url}: ${(err as Error).message}`);
      return { url, status: -1, sectionCount: 0, sizeBytes: 0 };
    } finally {
      clearTimeout(timerId);
    }
  }

  private extractH1(body: string): string | undefined {
    const m = /^#\s+(.+?)\s*$/m.exec(body);
    return m?.[1];
  }

  private extractBlockquote(body: string): string | undefined {
    const m = /^>\s+(.+?)\s*$/m.exec(body);
    return m?.[1];
  }

  private countH2(body: string): number {
    return (body.match(/^##\s+/gm) ?? []).length;
  }
}

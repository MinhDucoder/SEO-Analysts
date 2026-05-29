import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import { LiteFetcherService } from './lite-fetcher.service';

export interface GenerateResult {
  url: string;
  content: string;
  sizeBytes: number;
  warnings: string[];
}

@Injectable()
export class LlmsTxtGeneratorService {
  constructor(private readonly fetcher: LiteFetcherService) {}

  async generate(siteUrl: string, includeSections?: string[]): Promise<GenerateResult> {
    const warnings: string[] = [];
    const root = new URL('/', siteUrl).toString();
    const home = await this.fetcher.get(root);
    const $ = cheerio.load(home.body);
    const title = $('title').first().text().trim() || new URL(root).hostname;
    const desc = $('meta[name="description"]').attr('content')?.trim();
    const sitemap = await this.fetcher.get(new URL('/sitemap.xml', root).toString()).catch(() => ({
      status: 0,
      body: '',
    }));
    let urls: string[] = [];
    if (sitemap.status === 200 && sitemap.body) {
      try {
        const parsed = new XMLParser({ isArray: (name) => name === 'url' }).parse(sitemap.body);
        urls = ((parsed.urlset?.url ?? []) as Array<{ loc: string }>)
          .slice(0, 30)
          .map((u) => u.loc)
          .filter(Boolean);
      } catch {
        /* fall through */
      }
    }

    if (urls.length === 0) {
      warnings.push('Site has no sitemap, generated from homepage links');
      urls = $('a[href]')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((_: number, a: any) => $(a).attr('href') ?? '')
        .get()
        .filter((h: string) => h.startsWith(root))
        .slice(0, 20);
    }

    // Optionally filter sections by name if includeSections is provided
    void includeSections; // reserved for future section filtering

    const lines: string[] = [`# ${title}`, ''];
    if (desc) lines.push(`> ${desc}`, '');
    if (urls.length > 0) {
      lines.push('## Main pages');
      for (const u of urls) {
        try {
          lines.push(`- [${new URL(u).pathname || '/'}](${u})`);
        } catch {
          lines.push(`- [${u}](${u})`);
        }
      }
      lines.push('');
    }
    const content = lines.join('\n');
    return { url: root, content, sizeBytes: content.length, warnings };
  }
}

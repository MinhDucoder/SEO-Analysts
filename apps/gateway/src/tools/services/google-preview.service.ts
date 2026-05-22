import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { LiteFetcherService } from './lite-fetcher.service';
import {
  GooglePreviewRequestDto,
  GooglePreviewResponse,
  GooglePreviewWarning,
  GooglePreviewData,
} from '../dto/google-preview.dto';

@Injectable()
export class GooglePreviewService {
  constructor(private readonly fetcher: LiteFetcherService) {}

  executeManual(dto: GooglePreviewRequestDto): Omit<GooglePreviewResponse, 'meta'> {
    const data: GooglePreviewData = {
      url: dto.url ?? '',
      title: dto.title ?? '',
      description: dto.description ?? '',
      faviconUrl: dto.faviconUrl ?? '',
      breadcrumb: [],
      displayUrl: this.toDisplayUrl(dto.url ?? ''),
    };
    return { data, warnings: this.computeWarnings(data) };
  }

  async executeFromUrl(
    dto: GooglePreviewRequestDto,
  ): Promise<{ data: GooglePreviewData; warnings: GooglePreviewWarning[]; cached: boolean }> {
    const res = await this.fetcher.get(dto.fetchUrl!);
    const $ = cheerio.load(res.body);
    const title = $('title').first().text().trim();
    const description =
      $('meta[name="description"]').attr('content')?.trim() ??
      $('meta[property="og:description"]').attr('content')?.trim() ??
      '';
    const faviconHref =
      $('link[rel="icon"]').attr('href') ??
      $('link[rel="shortcut icon"]').attr('href') ??
      '/favicon.ico';
    const faviconUrl = new URL(faviconHref, res.url).toString();
    const breadcrumb = this.extractBreadcrumb($);
    const data: GooglePreviewData = {
      url: res.url,
      title,
      description,
      faviconUrl,
      breadcrumb,
      displayUrl: this.toDisplayUrl(res.url),
    };
    return { data, warnings: this.computeWarnings(data), cached: !!res.cached };
  }

  private extractBreadcrumb($: cheerio.CheerioAPI): string[] {
    const blocks = $('script[type="application/ld+json"]').toArray();
    for (const el of blocks) {
      try {
        const parsed = JSON.parse($(el).text());
        const items = parsed['@type'] === 'BreadcrumbList' ? parsed.itemListElement : null;
        if (Array.isArray(items)) {
          return items.map((i: any) => i?.name ?? i?.item?.name ?? '').filter(Boolean);
        }
      } catch {
        /* ignore malformed JSON-LD */
      }
    }
    return [];
  }

  private toDisplayUrl(url: string): string {
    if (!url) return '';
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      return [u.hostname, ...parts].join(' › ');
    } catch {
      return url;
    }
  }

  private computeWarnings(data: GooglePreviewData): GooglePreviewWarning[] {
    const w: GooglePreviewWarning[] = [];
    const titleLen = data.title.length;
    if (titleLen === 0) {
      w.push({ field: 'title', severity: 'error', message: 'Title is empty.' });
    } else if (titleLen < 30) {
      w.push({
        field: 'title',
        severity: 'warn',
        message: `Title is short (${titleLen} chars). Recommended 30–60.`,
      });
    } else if (titleLen > 60) {
      w.push({
        field: 'title',
        severity: 'warn',
        message: `Title may be truncated (${titleLen} chars). Recommended 30–60.`,
      });
    }
    const descLen = data.description.length;
    if (descLen === 0) {
      w.push({ field: 'description', severity: 'error', message: 'Description is empty.' });
    } else if (descLen < 70 || descLen > 160) {
      w.push({
        field: 'description',
        severity: 'warn',
        message: `Description length ${descLen}. Recommended 70–160.`,
      });
    }
    return w;
  }
}

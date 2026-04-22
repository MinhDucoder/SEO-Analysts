/**
 * @file Build analyzer `PageData` from raw HTML using Cheerio. Used by the
 * public-API content-only flow where no upstream crawler has run. Fields
 * only obtainable from live HTTP (statusCode, responseTimeMs, redirect
 * chain) are populated with sentinel values; rules that need them
 * declare `requires: ['http_metadata']` and are skipped by RuleRunner.
 */
import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ImageInfo, LinkInfo } from '@repo/shared';
import { PageData } from '../domain/page-data.interface';

@Injectable()
export class PageDataBuilderService {
  build(html: string, resolvedUrl?: string): PageData {
    const $ = cheerio.load(html);
    const baseHost = resolvedUrl ? this.safeHost(resolvedUrl) : null;

    const headings = (tag: string): string[] =>
      $(tag)
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 0);

    const images: ImageInfo[] = $('img')
      .map((_, el) => {
        const src = $(el).attr('src') ?? '';
        const alt = $(el).attr('alt');
        return {
          src,
          alt: alt ?? null,
          sizeBytes: 0,
          format: this.extFromUrl(src),
        };
      })
      .get();

    const allLinks = $('a[href]')
      .map((_, el) => {
        const href = $(el).attr('href') ?? '';
        const anchorText = $(el).text().trim();
        const rel = $(el).attr('rel') ?? null;
        const isInternal = this.isInternal(href, baseHost);
        return { href, anchorText, isInternal, rel, statusCode: 0 } as LinkInfo;
      })
      .get();

    const internalLinks = allLinks.filter((l) => l.isInternal);
    const externalLinks = allLinks.filter((l) => !l.isInternal);

    const openGraph: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const key = ($(el).attr('property') ?? '').replace(/^og:/, '');
      const value = $(el).attr('content') ?? '';
      if (key && value) openGraph[key] = value;
    });

    const twitterCard: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const key = ($(el).attr('name') ?? '').replace(/^twitter:/, '');
      const value = $(el).attr('content') ?? '';
      if (key && value) twitterCard[key] = value;
    });

    const schemaJsonLd = $('script[type="application/ld+json"]')
      .map((_, el) => $(el).html()?.trim() ?? '')
      .get()
      .filter((s) => s.length > 0);

    const textContent = $.root().text().replace(/\s+/g, ' ').trim();

    return {
      url: resolvedUrl ?? 'about:blank',
      finalUrl: resolvedUrl ?? 'about:blank',
      statusCode: resolvedUrl ? 200 : 0,
      responseTimeMs: 0,
      htmlSizeBytes: Buffer.byteLength(html, 'utf8'),
      title: $('title').first().text().trim() || undefined,
      metaDescription: $('meta[name="description"]').attr('content') ?? undefined,
      metaRobots: $('meta[name="robots"]').attr('content') ?? undefined,
      canonicalUrl: $('link[rel="canonical"]').attr('href') ?? undefined,
      language: $('html').attr('lang') ?? undefined,
      faviconUrl: $('link[rel="icon"], link[rel="shortcut icon"]').first().attr('href') ?? undefined,
      h1Tags: headings('h1'),
      h2Tags: headings('h2'),
      h3Tags: headings('h3'),
      h4Tags: headings('h4'),
      h5Tags: headings('h5'),
      h6Tags: headings('h6'),
      images,
      internalLinks,
      externalLinks,
      schemaJsonLd,
      openGraph,
      twitterCard,
      isHttps: resolvedUrl?.startsWith('https://') ?? false,
      redirectChain: [],
      contentEncoding: '',
      cacheControl: '',
      viewportContent: $('meta[name="viewport"]').attr('content') ?? undefined,
      textContent,
      rawHtml: html,
    };
  }

  private safeHost(url: string): string | null {
    try {
      return new URL(url).host;
    } catch {
      return null;
    }
  }

  private isInternal(href: string, baseHost: string | null): boolean {
    if (!href) return true;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return true;
    if (href.startsWith('/') && !href.startsWith('//')) return true;
    try {
      const u = new URL(href, baseHost ? `https://${baseHost}` : 'https://base.invalid');
      return baseHost ? u.host === baseHost : false;
    } catch {
      return true;
    }
  }

  private extFromUrl(src: string): string {
    const m = src.toLowerCase().match(/\.([a-z0-9]+)(?:[?#]|$)/);
    return m?.[1] ?? '';
  }
}

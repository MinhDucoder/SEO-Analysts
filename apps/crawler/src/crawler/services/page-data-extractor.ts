import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ImageInfo, LinkInfo } from '@repo/shared';
import { FetchResult } from '../domain/fetcher.interface';
import { PageData } from '../domain/page-data.interface';

@Injectable()
export class PageDataExtractor {
  extract(url: string, fetched: FetchResult): PageData {
    const $ = cheerio.load(fetched.html);
    const finalUrl = fetched.finalUrl || url;
    const finalHost = this.safeHostname(finalUrl);

    const title = $('head > title').first().text().trim() || undefined;
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || undefined;
    const metaRobots = $('meta[name="robots"]').attr('content')?.trim() || undefined;
    const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || undefined;
    const language = $('html').attr('lang')?.trim() || undefined;
    const viewportContent = $('meta[name="viewport"]').attr('content')?.trim() || undefined;
    const faviconUrl =
      $('link[rel="icon"]').attr('href')?.trim() ||
      $('link[rel="shortcut icon"]').attr('href')?.trim() ||
      undefined;

    const headings = (selector: string): string[] =>
      $(selector)
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
          sizeBytes: 0, // size not fetched here; LighthouseRunner provides perf signals
          format: this.detectFormat(src),
        } satisfies ImageInfo;
      })
      .get()
      .filter((img) => img.src.length > 0);

    const internalLinks: LinkInfo[] = [];
    const externalLinks: LinkInfo[] = [];
    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') ?? '').trim();
      if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
      const anchor = $(el).text().trim();
      const rel = $(el).attr('rel') ?? null;
      const isInternal = this.isInternalLink(href, finalHost);
      const link: LinkInfo = {
        href,
        anchorText: anchor,
        isInternal,
        rel,
        statusCode: 0, // not fetched per-link in this stage
      };
      if (isInternal) internalLinks.push(link);
      else externalLinks.push(link);
    });

    const schemaJsonLd: string[] = $('script[type="application/ld+json"]')
      .map((_, el) => $(el).contents().text().trim())
      .get()
      .filter((s) => s.length > 0);

    const openGraph: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property');
      const content = $(el).attr('content');
      if (prop && content) openGraph[prop] = content;
    });

    const twitterCard: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name');
      const content = $(el).attr('content');
      if (name && content) twitterCard[name] = content;
    });

    // Build text content: clone, strip noise, get body text
    const $clone = cheerio.load(fetched.html);
    $clone('script, style, noscript, nav, header, footer, svg').remove();
    const textContent = $clone('body').text().replace(/\s+/g, ' ').trim();

    return {
      url,
      finalUrl,
      statusCode: fetched.statusCode,
      responseTimeMs: fetched.responseTimeMs,
      htmlSizeBytes: fetched.htmlSizeBytes,
      title,
      metaDescription,
      metaRobots,
      canonicalUrl,
      language,
      faviconUrl,
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
      isHttps: finalUrl.startsWith('https://'),
      redirectChain: fetched.redirectChain,
      contentEncoding: fetched.contentEncoding,
      cacheControl: fetched.cacheControl,
      viewportContent,
      textContent,
      rawHtml: fetched.html,
    };
  }

  private safeHostname(u: string): string {
    try {
      return new URL(u).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  private isInternalLink(href: string, baseHost: string): boolean {
    if (href.startsWith('/') && !href.startsWith('//')) return true;
    try {
      const parsed = new URL(href);
      return parsed.hostname.toLowerCase() === baseHost;
    } catch {
      return true; // relative or malformed → treat as internal
    }
  }

  private detectFormat(src: string): string {
    const m = src.toLowerCase().match(/\.(webp|avif|png|jpe?g|gif|svg|bmp)(?:\?|$)/);
    return m && m[1] ? m[1].replace('jpeg', 'jpg') : 'unknown';
  }
}

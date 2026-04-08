---
name: web-crawler
description: Use this skill when the user asks about "web crawling", "Cheerio", "Playwright", "HTML parsing", "scraping", "robots.txt", "data extraction", or any web crawler development. Provides crawling patterns, HTML parsing, and polite crawling practices.
allowed-tools: Read, Grep, Glob, Bash(node *), Bash(npx *)
---

# Web Crawler Patterns

## Two-Phase Crawling Strategy

```
1. HTTP + Cheerio (default) -> Fast, low memory
2. Playwright (fallback) -> JS rendering, high memory
   Trigger: body text < 100 chars (indicates client-side rendering)
```

## Cheerio Fetcher

```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchWithCheerio(url: string) {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: { 'User-Agent': 'SEOAnalyzer/1.0' },
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data);
  const bodyText = $('body').text().trim();

  // Check if JS rendering needed
  if (bodyText.length < 100) {
    return null; // Signal to use Playwright
  }

  return {
    html: response.data,
    $,
    statusCode: response.status,
    headers: response.headers,
    responseTime: /* measured */,
  };
}
```

## Playwright Fetcher (Fallback)

```typescript
import { chromium } from 'playwright';

export async function fetchWithPlaywright(url: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const html = await page.content();
    const $ = cheerio.load(html);

    return { html, $, statusCode: response?.status() };
  } finally {
    await browser.close(); // Always close browser
  }
}
```

## Data Extraction

```typescript
export function extractSEOData($: cheerio.CheerioAPI, url: string) {
  return {
    title: $('title').text().trim(),
    metaDescription: $('meta[name="description"]').attr('content') || '',
    metaRobots: $('meta[name="robots"]').attr('content') || '',
    canonical: $('link[rel="canonical"]').attr('href') || '',
    h1Tags: $('h1').map((_, el) => $(el).text().trim()).get(),
    h2Tags: $('h2').map((_, el) => $(el).text().trim()).get(),
    images: $('img').map((_, el) => ({
      src: $(el).attr('src') || '',
      alt: $(el).attr('alt') || '',
    })).get(),
    internalLinks: $('a[href]').map((_, el) => $(el).attr('href'))
      .get()
      .filter(href => isInternalLink(href, url)),
    externalLinks: $('a[href]').map((_, el) => $(el).attr('href'))
      .get()
      .filter(href => isExternalLink(href, url)),
    schemaOrg: $('script[type="application/ld+json"]')
      .map((_, el) => safeParseJSON($(el).html() || ''))
      .get(),
    ogTags: extractOGTags($),
    responseHeaders: {}, // filled from HTTP response
  };
}
```

## robots.txt Parser

```typescript
import robotsParser from 'robots-parser';

export async function checkRobotsTxt(url: string) {
  const robotsUrl = new URL('/robots.txt', url).href;

  try {
    const response = await axios.get(robotsUrl, { timeout: 5000 });
    const robots = robotsParser(robotsUrl, response.data);

    return {
      exists: true,
      isAllowed: robots.isAllowed(url, 'SEOAnalyzer'),
      sitemapUrls: robots.getSitemaps(),
    };
  } catch {
    return { exists: false, isAllowed: true, sitemapUrls: [] };
  }
}
```

## Polite Crawling

```
- Respect robots.txt (always check before crawling)
- 500ms delay between same-domain requests
- 30s timeout per page
- Rotate User-Agent string
- Max 5 redirects
- Handle connection errors gracefully
```

## Checklist

```
- Always check robots.txt before crawling
- Default to Cheerio, fallback to Playwright
- Set timeouts on all network requests
- Close Playwright browser in finally block
- Handle encoding issues (utf-8 default)
- Extract all SEO-relevant data in one pass
- Cache robots.txt results (24h TTL)
```

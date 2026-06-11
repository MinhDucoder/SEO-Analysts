/**
 * @file Structured representation of a crawled page — the single
 * input shape consumed by seo-analyzer and keyword-analyzer.
 */
import { ImageInfo, LinkInfo } from '@repo/shared';

export interface PageData {
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  htmlSizeBytes: number;
  title?: string;
  metaDescription?: string;
  metaRobots?: string;
  canonicalUrl?: string;
  language?: string;
  faviconUrl?: string;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  h4Tags: string[];
  h5Tags: string[];
  h6Tags: string[];
  images: ImageInfo[];
  internalLinks: LinkInfo[];
  externalLinks: LinkInfo[];
  schemaJsonLd: string[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  isHttps: boolean;
  redirectChain: string[];
  contentEncoding: string;
  cacheControl: string;
  viewportContent?: string;
  textContent: string;
  rawHtml: string;
  aiBotAccess?: {
    robotsTxtUrl: string;
    robotsTxtStatus: number;
    rules: Array<{ userAgent: string; disallow: string[]; allow: string[] }>;
  };
  llmsTxt?: {
    url: string;
    status: number;
    h1?: string;
    summary?: string;
    sectionCount: number;
    sizeBytes: number;
  };
  /** Parsed JSON-LD blocks (objects) — populated alongside schemaJsonLd for GEO rules */
  jsonLdBlocks?: Record<string, unknown>[];
  /** Quotable structural blocks extracted from page HTML — used by G7 quotable-density rule.
   * TODO Phase 2 follow-up: extract quotableBlocks from Cheerio in crawler.orchestrator */
  quotableBlocks?: {
    tables: number;
    lists: number;
    blockquotes: number;
    dls: number;
  };
  /** H2 sections extracted from page HTML — used by G4 semantic-completeness rule.
   * TODO Phase 4 follow-up: extract sections from Cheerio in crawler.orchestrator */
  sections?: Array<{ heading: string; text: string }>;
}

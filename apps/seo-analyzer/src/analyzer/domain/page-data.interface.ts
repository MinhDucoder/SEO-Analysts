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
}

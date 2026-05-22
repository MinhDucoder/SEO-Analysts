import { api } from "@/lib/api/client";

export interface ToolsResponseMeta {
  quotaUsed: number;
  quotaLeft: number;
  cached: boolean;
}

export interface ToolWarning {
  field: string;
  severity: "info" | "warn" | "error";
  message: string;
}

// ─── Google preview ──────────────────────────────────────────────────────────
export interface GooglePreviewRequest {
  mode: "manual" | "url";
  url?: string;
  title?: string;
  description?: string;
  faviconUrl?: string;
  fetchUrl?: string;
}
export interface GooglePreviewData {
  url: string;
  title: string;
  description: string;
  faviconUrl: string;
  breadcrumb: string[];
  displayUrl: string;
}
export interface GooglePreviewResponse {
  data: GooglePreviewData;
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const googlePreview = (req: GooglePreviewRequest) =>
  api.post("tools/google-preview", { json: req }).json<GooglePreviewResponse>();

// ─── Social preview ──────────────────────────────────────────────────────────
export interface SocialPreviewRequest {
  mode: "manual" | "url";
  url?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  ogType?: string;
  twitterCard?: "summary" | "summary_large_image";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  fetchUrl?: string;
}
export interface SocialPreviewData {
  url?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  ogImageMeta?: { width: number; height: number; bytes: number };
}
export interface SocialPreviewResponse {
  data: SocialPreviewData;
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const socialPreview = (req: SocialPreviewRequest) =>
  api.post("tools/social-preview", { json: req }).json<SocialPreviewResponse>();

// ─── Schema preview ──────────────────────────────────────────────────────────
export interface SchemaPreviewRequest {
  mode: "paste" | "url";
  raw?: string;
  fetchUrl?: string;
}
export interface SchemaBlock {
  type: string;
  raw: unknown;
  validation: { errors: string[]; warnings: string[] };
}
export interface SchemaPreviewResponse {
  data: {
    blocks: SchemaBlock[];
    summary: { totalBlocks: number; validBlocks: number; invalidBlocks: number };
  };
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const schemaPreview = (req: SchemaPreviewRequest) =>
  api.post("tools/schema-preview", { json: req }).json<SchemaPreviewResponse>();

// ─── Sitemap validator ───────────────────────────────────────────────────────
export interface SitemapValidatorRequest {
  siteUrl: string;
  options?: { followSitemapIndex?: boolean };
}
export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  isValid: boolean;
  errors: string[];
}
export interface SitemapValidatorResponse {
  data: {
    robots: {
      url: string;
      exists: boolean;
      rules: Array<{ userAgent: string; type: "allow" | "disallow"; value: string }>;
      sitemaps: string[];
      syntaxErrors: string[];
    };
    sitemap: {
      url: string;
      type: "index" | "urlset" | "empty";
      isIndex: boolean;
      nestedSitemaps?: Array<{ url: string; urlCount: number; errors: string[] }>;
      urls?: SitemapUrlEntry[];
      totalUrls: number;
      displayedUrls: number;
      truncated: boolean;
    };
  };
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const sitemapValidator = (req: SitemapValidatorRequest) =>
  api.post("tools/sitemap-validator", { json: req }).json<SitemapValidatorResponse>();

// ─── Favicon checker ─────────────────────────────────────────────────────────
export interface FaviconCheckerRequest {
  url: string;
}
export interface FaviconIcon {
  source: "link" | "manifest" | "fallback";
  rel?: string;
  href: string;
  exists: boolean;
  status: number;
  format?: "ico" | "png" | "svg" | "jpg";
  size?: { width: number; height: number };
  fileSizeBytes?: number;
}
export interface FaviconCheckerResponse {
  data: {
    icons: FaviconIcon[];
    coverage: {
      hasBasic: boolean;
      hasAppleTouch: boolean;
      hasManifest: boolean;
      hasPwaSizes: boolean;
      hasMaskIcon: boolean;
    };
  };
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const faviconChecker = (req: FaviconCheckerRequest) =>
  api.post("tools/favicon-checker", { json: req }).json<FaviconCheckerResponse>();

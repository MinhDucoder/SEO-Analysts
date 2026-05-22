import { IsObject, IsOptional, IsUrl } from 'class-validator';

export class SitemapValidatorRequestDto {
  @IsUrl({ require_protocol: true })
  siteUrl!: string;

  @IsOptional()
  @IsObject()
  options?: { followSitemapIndex?: boolean };
}

export interface RobotsRule {
  userAgent: string;
  type: 'allow' | 'disallow';
  value: string;
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  isValid: boolean;
  errors: string[];
}

export interface NestedSitemap {
  url: string;
  urlCount: number;
  errors: string[];
}

export interface SitemapValidatorWarning {
  field: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

export interface SitemapValidatorResponse {
  data: {
    robots: {
      url: string;
      exists: boolean;
      rules: RobotsRule[];
      sitemaps: string[];
      syntaxErrors: string[];
    };
    sitemap: {
      url: string;
      type: 'index' | 'urlset' | 'empty';
      isIndex: boolean;
      nestedSitemaps?: NestedSitemap[];
      urls?: SitemapUrlEntry[];
      totalUrls: number;
      displayedUrls: number;
      truncated: boolean;
    };
  };
  warnings: SitemapValidatorWarning[];
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CrawlerOrchestrator } from './crawler.orchestrator';

interface CrawlRequestProto {
  url: string;
  audit_id: string;
  options?: {
    timeout_ms?: number;
    force_playwright?: boolean;
    include_lighthouse?: boolean;
    user_agent?: string;
  };
}

@Controller()
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);
  private readonly bootedAt = Date.now();

  constructor(private readonly orchestrator: CrawlerOrchestrator) {}

  @GrpcMethod('CrawlerService', 'CrawlUrl')
  async crawlUrl(request: CrawlRequestProto) {
    this.logger.log(`gRPC CrawlUrl audit=${request.audit_id} url=${request.url}`);
    const result = await this.orchestrator.crawl(request.url, {
      forcePlaywright: request.options?.force_playwright,
      includeLighthouse: request.options?.include_lighthouse,
      userAgent: request.options?.user_agent,
      timeoutMs: request.options?.timeout_ms,
    });

    return {
      audit_id: request.audit_id,
      page_data: this.toProtoPageData(result.pageData),
      cwv_metrics: {
        lcp_ms: result.cwvMetrics.lcpMs,
        inp_ms: result.cwvMetrics.inpMs,
        cls: result.cwvMetrics.cls,
        performance_score: result.cwvMetrics.performanceScore,
        accessibility_score: result.cwvMetrics.accessibilityScore,
        best_practices_score: result.cwvMetrics.bestPracticesScore,
        seo_score: result.cwvMetrics.seoScore,
      },
      metadata: {
        crawler_type: result.metadata.crawlerType,
        is_spa: result.metadata.isSpa,
        crawl_duration_ms: result.metadata.crawlDurationMs,
        lighthouse_duration_ms: result.metadata.lighthouseDurationMs,
        lighthouse_cached: result.metadata.lighthouseCached,
      },
    };
  }

  @GrpcMethod('CrawlerService', 'HealthCheck')
  healthCheck() {
    return {
      healthy: true,
      version: process.env.npm_package_version ?? '0.0.1',
      uptime_seconds: Math.floor((Date.now() - this.bootedAt) / 1000),
    };
  }

  private toProtoPageData(pd: import('./interfaces/page-data.interface').PageData) {
    return {
      url: pd.url,
      final_url: pd.finalUrl,
      status_code: pd.statusCode,
      response_time_ms: pd.responseTimeMs,
      html_size_bytes: pd.htmlSizeBytes,
      title: pd.title,
      meta_description: pd.metaDescription,
      meta_robots: pd.metaRobots,
      canonical_url: pd.canonicalUrl,
      language: pd.language,
      favicon_url: pd.faviconUrl,
      h1_tags: pd.h1Tags,
      h2_tags: pd.h2Tags,
      h3_tags: pd.h3Tags,
      h4_tags: pd.h4Tags,
      h5_tags: pd.h5Tags,
      h6_tags: pd.h6Tags,
      images: pd.images.map((i) => ({
        src: i.src,
        alt: i.alt ?? undefined,
        size_bytes: i.sizeBytes,
        format: i.format,
      })),
      internal_links: pd.internalLinks.map((l) => ({
        href: l.href,
        anchor_text: l.anchorText,
        is_internal: true,
        rel: l.rel ?? undefined,
        status_code: l.statusCode,
      })),
      external_links: pd.externalLinks.map((l) => ({
        href: l.href,
        anchor_text: l.anchorText,
        is_internal: false,
        rel: l.rel ?? undefined,
        status_code: l.statusCode,
      })),
      schema_json_ld: pd.schemaJsonLd,
      open_graph: pd.openGraph,
      twitter_card: pd.twitterCard,
      is_https: pd.isHttps,
      redirect_chain: pd.redirectChain,
      content_encoding: pd.contentEncoding,
      cache_control: pd.cacheControl,
      viewport_content: pd.viewportContent,
      text_content: pd.textContent,
      raw_html: pd.rawHtml,
    };
  }
}

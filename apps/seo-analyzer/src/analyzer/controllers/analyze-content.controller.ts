/**
 * @file gRPC controller for the public-API content-only analysis flow.
 * Accepts raw HTML (already fetched by gateway's ContentExtractor),
 * builds a PageData via PageDataBuilder, runs the registry through
 * RuleRunner.runContent (skipping rules that require live HTTP/perf
 * data), decorates each result with RuleMetadataService metadata, and
 * returns the proto `AnalyzeContentResult` shape.
 *
 * Proto: `packages/proto/analyzer/v1/analyzer.proto` (AnalyzeContent RPC).
 */
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PageDataBuilderService } from '../services/page-data-builder.service';
import { RuleRunner } from '../services/rule-runner';
import { RuleMetadataService } from '../services/rule-metadata.service';
import { RULE_VERSION } from '../domain/rule-version';

// Proto request (snake_case per gRPC convention)
interface AnalyzeContentRequest {
  request_id: string;
  html: string;
  target_keyword: string;
  secondary_keywords: string[];
  language: string;
  mode: number; // 0=UNSPECIFIED, 1=CONTENT_ONLY, 2=FULL
  resolved_url: string;
}

interface RuleIssueProto {
  rule_id: string;
  status: string; // "pass" | "warn" | "fail"
  score: number;
  category: string;
  severity: string;
  audiences: string[];
  message: string;
  template_suggestion: string;
  evidence: Record<string, unknown>;
  doc_ref: string;
}

interface ContentStatsProto {
  word_count: number;
  character_count: number;
  reading_time_sec: number;
  paragraph_count: number;
  image_count: number;
  internal_link_count: number;
  external_link_count: number;
}

interface AnalyzeContentResult {
  rule_version: string;
  issues: RuleIssueProto[];
  content_stats: ContentStatsProto;
}

const WORDS_PER_MINUTE = 250;

@Controller()
export class AnalyzeContentController {
  private readonly logger = new Logger(AnalyzeContentController.name);

  constructor(
    private readonly builder: PageDataBuilderService,
    private readonly runner: RuleRunner,
    private readonly metadata: RuleMetadataService,
  ) {}

  @GrpcMethod('SeoAnalyzerService', 'AnalyzeContent')
  async analyzeContent(req: AnalyzeContentRequest): Promise<AnalyzeContentResult> {
    const resolvedUrl = req.resolved_url || undefined;
    const pageData = this.builder.build(req.html, resolvedUrl);
    const mode = req.mode === 2 ? 'full' : 'content_only';

    const results = this.runner.runContent(
      pageData,
      req.target_keyword || undefined,
      mode,
    );

    const issues: RuleIssueProto[] = results.map((r) => {
      const meta = this.metadata.get(r.ruleId);
      return {
        rule_id: r.ruleId,
        status: r.status,
        score: r.score,
        category: String(r.category),
        severity: meta.severity,
        audiences: meta.audiences,
        message: r.message,
        template_suggestion: r.suggestion ?? '',
        evidence: (r.metadata ?? {}) as Record<string, unknown>,
        doc_ref: meta.docRef ?? '',
      };
    });

    const words = pageData.textContent.split(/\s+/).filter(Boolean).length;
    const contentStats: ContentStatsProto = {
      word_count: words,
      character_count: pageData.textContent.length,
      reading_time_sec: Math.ceil((words / WORDS_PER_MINUTE) * 60),
      paragraph_count: (pageData.rawHtml.match(/<p\b/gi) ?? []).length,
      image_count: pageData.images.length,
      internal_link_count: pageData.internalLinks.length,
      external_link_count: pageData.externalLinks.length,
    };

    this.logger.log(
      `AnalyzeContent req=${req.request_id} mode=${mode} words=${words} issues=${issues.length}`,
    );

    return {
      rule_version: RULE_VERSION,
      issues,
      content_stats: contentStats,
    };
  }
}

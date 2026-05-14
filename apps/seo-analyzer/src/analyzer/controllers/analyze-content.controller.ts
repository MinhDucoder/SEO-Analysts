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

// Proto request — JS surface is camelCase because the loader is configured
// with `keepCase: false` (see apps/seo-analyzer/src/main.ts loader options).
// Proto-loader converts snake_case proto fields to lowerCamelCase JS names;
// snake_case keys on the wire are silently dropped on serialize/deserialize.
interface AnalyzeContentRequest {
  requestId: string;
  html: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  language: string;
  mode: number; // 0=UNSPECIFIED, 1=CONTENT_ONLY, 2=FULL
  resolvedUrl: string;
}

interface RuleIssueProto {
  ruleId: string;
  status: string; // "pass" | "warn" | "fail"
  score: number;
  category: string;
  severity: string;
  audiences: string[];
  message: string;
  templateSuggestion: string;
  evidence: Record<string, unknown>;
  docRef: string;
}

interface ContentStatsProto {
  wordCount: number;
  characterCount: number;
  readingTimeSec: number;
  paragraphCount: number;
  imageCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
}

interface AnalyzeContentResult {
  ruleVersion: string;
  issues: RuleIssueProto[];
  contentStats: ContentStatsProto;
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
    const resolvedUrl = req.resolvedUrl || undefined;
    const pageData = this.builder.build(req.html, resolvedUrl);
    const mode = req.mode === 2 ? 'full' : 'content_only';

    const results = this.runner.runContent(
      pageData,
      req.targetKeyword || undefined,
      mode,
    );

    const issues: RuleIssueProto[] = results.map((r) => {
      const meta = this.metadata.get(r.ruleId);
      return {
        ruleId: r.ruleId,
        status: r.status,
        score: r.score,
        category: String(r.category),
        severity: meta.severity,
        audiences: meta.audiences,
        message: r.message,
        templateSuggestion: r.suggestion ?? '',
        evidence: (r.metadata ?? {}) as Record<string, unknown>,
        docRef: meta.docRef ?? '',
      };
    });

    const words = pageData.textContent.split(/\s+/).filter(Boolean).length;
    const contentStats: ContentStatsProto = {
      wordCount: words,
      characterCount: pageData.textContent.length,
      readingTimeSec: Math.ceil((words / WORDS_PER_MINUTE) * 60),
      paragraphCount: (pageData.rawHtml.match(/<p\b/gi) ?? []).length,
      imageCount: pageData.images.length,
      internalLinkCount: pageData.internalLinks.length,
      externalLinkCount: pageData.externalLinks.length,
    };

    this.logger.log(
      `AnalyzeContent req=${req.requestId} mode=${mode} words=${words} issues=${issues.length}`,
    );

    return {
      ruleVersion: RULE_VERSION,
      issues,
      contentStats,
    };
  }
}

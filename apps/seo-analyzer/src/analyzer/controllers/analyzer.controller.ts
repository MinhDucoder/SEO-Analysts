/**
 * @file gRPC surface of the analyzer service.
 * Sync analyze is mainly for admin tooling; production traffic goes
 * through `AnalyzerWorker` (BullMQ). Also exposes rule-management RPCs.
 * Proto: `packages/proto/analyzer/v1/analyzer.proto`.
 */
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AnalyzerService } from '../services/analyzer.service';
import { RuleRegistry } from '../services/rule-registry';
import { RuleMetadataService } from '../services/rule-metadata.service';
import { PageData } from '../domain/page-data.interface';

interface ProtoRuleResult {
  rule_id: string;
  rule_name: string;
  status: string;
  score: number;
  weight: number;
  category: string;
  message: string;
  suggestion?: string;
  metadata: Record<string, string>;
}

@Controller()
export class AnalyzerController {
  constructor(
    private readonly analyzer: AnalyzerService,
    private readonly registry: RuleRegistry,
    private readonly ruleMetadata: RuleMetadataService,
  ) {}

  @GrpcMethod('SeoAnalyzerService', 'AnalyzePage')
  async analyzePage(req: { auditId: string; pageData: any; targetKeyword?: string }) {
    const pageData = this.mapPageData(req.pageData);
    const result = await this.analyzer.analyze(req.auditId, pageData, req.targetKeyword);

    const ruleResults: ProtoRuleResult[] = result.ruleResults.map((r) => ({
      rule_id: r.ruleId,
      rule_name: r.ruleName,
      status: r.status,
      score: r.score,
      weight: r.weight,
      category: r.category,
      message: r.message,
      suggestion: r.suggestion ?? undefined,
      metadata: Object.fromEntries(
        Object.entries(r.metadata).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
      ),
    }));

    return {
      audit_id: result.auditId,
      rule_results: ruleResults,
      category_scores: result.categoryScores.map((c) => ({
        category: c.category,
        score: c.score,
        total_rules: c.totalRules,
        passed: c.passed,
        warned: c.warned,
        failed: c.failed,
      })),
      overall_score: result.overallScore,
      classification: result.classification,
    };
  }

  @GrpcMethod('SeoAnalyzerService', 'ListRules')
  async listRules() {
    const rows = await this.analyzer.listAllRules();
    return { rules: rows.map(this.mapRuleToProto) };
  }

  @GrpcMethod('SeoAnalyzerService', 'GetRulesByCategory')
  async getRulesByCategory(req: { category: string }) {
    const rows = await this.analyzer.listRulesByCategory(req.category);
    return { rules: rows.map(this.mapRuleToProto) };
  }

  @GrpcMethod('SeoAnalyzerService', 'UpdateRuleWeight')
  async updateRuleWeight(req: { ruleId: string; newWeight: number }) {
    const id = req.ruleId ?? (req as any).rule_id;
    const weight = Number(req.newWeight ?? (req as any).new_weight);
    if (!Number.isInteger(weight) || weight < 1 || weight > 10) {
      throw new Error('Weight must be an integer between 1 and 10');
    }
    const row = await this.analyzer.updateRuleWeight(id, weight);
    return { rule: this.mapRuleToProto(row) };
  }

  @GrpcMethod('SeoAnalyzerService', 'UpdateRuleEnabled')
  async updateRuleEnabled(req: { ruleId: string; isEnabled: boolean }) {
    const id = req.ruleId ?? (req as any).rule_id;
    const isEnabled = Boolean(req.isEnabled ?? (req as any).is_enabled);
    const row = await this.analyzer.updateRuleEnabled(id, isEnabled);
    return { rule: this.mapRuleToProto(row) };
  }

  @GrpcMethod('SeoAnalyzerService', 'HealthCheck')
  healthCheck() {
    return { healthy: true, version: process.env.npm_package_version ?? '0.0.1' };
  }

  private mapRuleToProto = (row: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: string;
    weight: number;
    isEnabled: boolean;
  }) => {
    const meta = this.ruleMetadata.get(row.name);
    const impl = this.registry.get(row.name);
    const availableIn =
      impl?.requires && impl.requires.length > 0 ? 'full' : 'content_only';
    return {
      id: row.id,
      name: row.name,
      // Wire format is camelCase — proto-loader runs with `keepCase: false`
      // on both ends (apps/seo-analyzer/src/main.ts + packages/proto/src/index.ts),
      // so snake_case keys are silently dropped during serialization.
      displayName: row.displayName,
      description: row.description,
      // Prisma stores enum as lowercase ("meta", "headings", …); proto
      // IssueCategory uses ISSUE_CATEGORY_* form. Loader's `enums: String`
      // expects the proto symbol name.
      category: `ISSUE_CATEGORY_${row.category.toUpperCase()}`,
      weight: row.weight,
      isEnabled: row.isEnabled,
      severity: meta.severity,
      audiences: meta.audiences,
      docRef: meta.docRef ?? '',
      availableIn,
    };
  };

  private mapPageData(raw: any): PageData {
    return {
      url: raw.url,
      finalUrl: raw.finalUrl ?? raw.final_url ?? raw.url,
      statusCode: Number(raw.statusCode ?? raw.status_code ?? 200),
      responseTimeMs: Number(raw.responseTimeMs ?? raw.response_time_ms ?? 0),
      htmlSizeBytes: Number(raw.htmlSizeBytes ?? raw.html_size_bytes ?? 0),
      title: raw.title,
      metaDescription: raw.metaDescription ?? raw.meta_description,
      metaRobots: raw.metaRobots ?? raw.meta_robots,
      canonicalUrl: raw.canonicalUrl ?? raw.canonical_url,
      language: raw.language,
      faviconUrl: raw.faviconUrl ?? raw.favicon_url,
      h1Tags: raw.h1Tags ?? raw.h1_tags ?? [],
      h2Tags: raw.h2Tags ?? raw.h2_tags ?? [],
      h3Tags: raw.h3Tags ?? raw.h3_tags ?? [],
      h4Tags: raw.h4Tags ?? raw.h4_tags ?? [],
      h5Tags: raw.h5Tags ?? raw.h5_tags ?? [],
      h6Tags: raw.h6Tags ?? raw.h6_tags ?? [],
      images: raw.images ?? [],
      internalLinks: raw.internalLinks ?? raw.internal_links ?? [],
      externalLinks: raw.externalLinks ?? raw.external_links ?? [],
      schemaJsonLd: raw.schemaJsonLd ?? raw.schema_json_ld ?? [],
      openGraph: raw.openGraph ?? raw.open_graph ?? {},
      twitterCard: raw.twitterCard ?? raw.twitter_card ?? {},
      isHttps: Boolean(raw.isHttps ?? raw.is_https ?? false),
      redirectChain: raw.redirectChain ?? raw.redirect_chain ?? [],
      contentEncoding: raw.contentEncoding ?? raw.content_encoding ?? '',
      cacheControl: raw.cacheControl ?? raw.cache_control ?? '',
      viewportContent: raw.viewportContent ?? raw.viewport_content,
      textContent: raw.textContent ?? raw.text_content ?? '',
      rawHtml: raw.rawHtml ?? raw.raw_html ?? '',
    };
  }
}

/**
 * @file Orchestrator for POST /api/v1/public/check.
 *
 * Flow:
 *   1. Cache lookup (sha256 of content+keyword+lang+mode+ruleVersion)
 *   2. ContentExtractor (html passthrough | markdown→html | url→liteFetch)
 *   3. AnalyzerGrpcClient.analyzeContent
 *   4. SuggestionEnricherService.enrich (off/template/llm) — returns parallel
 *      suggestions[] + source + degraded flag
 *   5. Build issues[], optional filter (categories/audiences/minSeverity)
 *   6. Assemble response, cache, return
 */
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  ContentExtractorService,
  PublicCheckInput,
} from './content-extractor.service';
import { AnalyzerGrpcClient } from '../../infra/grpc/analyzer.client';
import { RedisService } from '../../infra/redis/redis.service';
import {
  PUBLIC_API_REDIS_KEYS,
  PUBLIC_API_CACHE_TTL,
  PUBLIC_API_CACHE_SCHEMA_VERSION,
  PLAN_FEATURES,
  FeatureFlag,
} from '@repo/shared';
import type { PublicCheckRequestDto, PublicCheckFilterDto } from '../dto/public-check-request.dto';
import {
  SuggestionEnricherService,
  type EnrichMode,
  type Suggestion,
} from './suggestion-enricher.service';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { QuotaCounterService } from '../../billing/services/quota-counter.service';

export interface ExecuteCtx {
  apiKeyId: string;
  userId: string;
  ip: string;
  usage?: {
    remaining: { minute: number; day: number };
    resetAt: { minute: string; day: string };
  };
}

type IssueSeverity = 'info' | 'warning' | 'error';
type IssueAudience = 'writer' | 'dev';

export interface PublicCheckIssue {
  ruleId: string;
  severity: IssueSeverity;
  category: string;
  audience: IssueAudience[];
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  suggestion: Suggestion | null;
  docRef?: string;
}

export interface PublicCheckResponse {
  score: number;
  scoreBreakdown: Record<string, number>;
  issues: PublicCheckIssue[];
  summary?: { writer: string; dev: string };
  meta: {
    inputType: 'url' | 'markdown' | 'html';
    resolvedUrl?: string;
    contentStats: { words: number; characters: number; readingTimeSec: number };
    processingTimeMs: number;
    ruleVersion: string;
    enrichMode: EnrichMode;
    suggestionSource: 'llm' | 'template' | 'mixed' | 'none';
    degraded: boolean;
    cached: boolean;
    requestId: string;
    usage: {
      remaining: { minute: number; day: number };
      resetAt: { minute: string; day: string };
    };
  };
}

const SEVERITY_ORDER: Record<IssueSeverity, number> = { info: 0, warning: 1, error: 2 };

@Injectable()
export class PublicCheckService {
  private readonly logger = new Logger(PublicCheckService.name);
  // Captured per-instance so tests + ops env overrides take effect at
  // service construction; bumping the env or the shared default forces
  // a fresh cache namespace.
  private readonly cacheSchemaVersion: string =
    process.env.PUBLIC_API_CACHE_SCHEMA_VERSION ?? PUBLIC_API_CACHE_SCHEMA_VERSION;

  constructor(
    private readonly extractor: ContentExtractorService,
    private readonly analyzer: AnalyzerGrpcClient,
    private readonly redis: RedisService,
    private readonly enricher: SuggestionEnricherService,
    private readonly entitlement: EntitlementService,
    private readonly counter: QuotaCounterService,
  ) {}

  async execute(
    dto: PublicCheckRequestDto,
    ctx: ExecuteCtx,
  ): Promise<PublicCheckResponse> {
    const t0 = Date.now();
    const requestId = `req_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
    const enrichMode: EnrichMode = dto.options?.enrichMode ?? 'llm';
    const language = dto.options?.language ?? 'vi';
    const filter = dto.options?.filter;

    const cacheKey = this.cacheKey(dto, this.cacheSchemaVersion);
    const cached = await this.tryGet(cacheKey);
    if (cached) {
      cached.meta.cached = true;
      cached.meta.requestId = requestId;
      if (ctx.usage) cached.meta.usage = ctx.usage;
      // Cache stores the FULL (pre-filter) issue list. Apply the
      // current request's filter on read so different filters across
      // requests with identical content don't return stale projections.
      return { ...cached, issues: this.applyFilter(cached.issues, filter) };
    }

    const extracted = await this.extractor.extract(dto.input as PublicCheckInput);

    const result = await this.analyzer.analyzeContent({
      requestId,
      html: extracted.html,
      targetKeyword: dto.targetKeyword,
      secondaryKeywords: dto.secondaryKeywords ?? [],
      language,
      mode: 'content_only',
      resolvedUrl: extracted.resolvedUrl,
    });

    const contentHash = createHash('sha256').update(extracted.html).digest('hex').slice(0, 32);

    // AI entitlement check: if enrichMode is 'llm' and we have a userId,
    // verify the user's plan allows AI suggestions and has remaining quota.
    let effectiveEnrichMode = enrichMode;
    if (enrichMode === 'llm' && ctx.userId) {
      const aiAllowed = await this.entitlement.hasFeature(ctx.userId, FeatureFlag.AI_SUGGESTIONS);
      if (!aiAllowed.allowed) {
        throw new ForbiddenException({ code: 'AI_NOT_AVAILABLE', message: 'AI suggestions require Pro plan' });
      }
      // Admin god-mode: no AI calls/month metering.
      if (!(await this.entitlement.isAdmin(ctx.userId))) {
        const plan = await this.entitlement.getEffectivePlan(ctx.userId);
        const r = await this.counter.consume(ctx.userId, 'ai_calls_monthly', PLAN_FEATURES[plan].ai_calls_monthly, 1);
        if (!r.allowed) {
          throw new ForbiddenException({ code: 'AI_QUOTA_EXCEEDED', message: 'AI calls/month exceeded' });
        }
      }
    } else if (enrichMode === 'llm' && !ctx.userId) {
      // No userId on this API key — skip entitlement, rate-limit guards already applied
      effectiveEnrichMode = 'template';
    }

    const enrichment = await this.enricher.enrich(
      result.issues,
      {
        apiKeyId: ctx.apiKeyId,
        targetKeyword: dto.targetKeyword,
        secondaryKeywords: dto.secondaryKeywords ?? [],
        language,
        contentExcerpt: extracted.html,
        ruleVersion: result.ruleVersion,
        contentHash,
      },
      effectiveEnrichMode,
    );

    const allIssues: PublicCheckIssue[] = result.issues.map((i, idx) => ({
      ruleId: i.ruleId,
      severity: this.toSeverity(i.severity),
      category: i.category,
      audience: (i.audiences ?? []).filter(
        (a): a is IssueAudience => a === 'writer' || a === 'dev',
      ),
      title: this.shortTitle(i.message),
      description: i.message,
      evidence: i.evidence ?? {},
      suggestion: enrichment.suggestions[idx] ?? null,
      docRef: i.docRef || undefined,
    }));

    const score = this.computeScore(result.issues);
    const scoreBreakdown = this.computeBreakdown(result.issues);

    const fullResponse: PublicCheckResponse = {
      score,
      scoreBreakdown,
      issues: allIssues,
      meta: {
        inputType: dto.input.type,
        resolvedUrl: extracted.resolvedUrl,
        contentStats: {
          words: result.contentStats.wordCount,
          characters: result.contentStats.characterCount,
          readingTimeSec: result.contentStats.readingTimeSec,
        },
        processingTimeMs: Date.now() - t0,
        ruleVersion: result.ruleVersion,
        enrichMode: effectiveEnrichMode,
        suggestionSource: enrichment.source,
        degraded: enrichment.degraded,
        cached: false,
        requestId,
        usage: ctx.usage ?? {
          remaining: { minute: 0, day: 0 },
          resetAt: { minute: '', day: '' },
        },
      },
    };

    const ttl =
      enrichment.source === 'llm' || enrichment.source === 'mixed'
        ? PUBLIC_API_CACHE_TTL.PUBLIC_CHECK_LLM_SECONDS
        : PUBLIC_API_CACHE_TTL.PUBLIC_CHECK_TEMPLATE_SECONDS;
    await this.trySet(cacheKey, fullResponse, ttl);

    return { ...fullResponse, issues: this.applyFilter(allIssues, filter) };
  }

  private applyFilter(
    issues: PublicCheckIssue[],
    filter: PublicCheckFilterDto | undefined,
  ): PublicCheckIssue[] {
    if (!filter) return issues;
    return issues.filter((iss) => {
      if (filter.categories && !filter.categories.includes(iss.category)) return false;
      if (filter.audiences && !iss.audience.some((a) => filter.audiences!.includes(a))) {
        return false;
      }
      if (
        filter.minSeverity &&
        SEVERITY_ORDER[iss.severity] < SEVERITY_ORDER[filter.minSeverity]
      ) {
        return false;
      }
      return true;
    });
  }

  private toSeverity(s: string): IssueSeverity {
    if (s === 'error' || s === 'warning' || s === 'info') return s;
    return 'info';
  }

  private shortTitle(msg: string): string {
    return msg.length > 80 ? `${msg.slice(0, 77)}...` : msg;
  }

  private computeScore(issues: Array<{ score: number }>): number {
    if (issues.length === 0) return 100;
    return Math.round(issues.reduce((a, i) => a + i.score, 0) / issues.length);
  }

  private computeBreakdown(
    issues: Array<{ category: string; score: number }>,
  ): Record<string, number> {
    const bucket: Record<string, number[]> = {};
    for (const i of issues) {
      const key = String(i.category);
      (bucket[key] ??= []).push(i.score);
    }
    const out: Record<string, number> = {};
    for (const [k, arr] of Object.entries(bucket)) {
      out[k] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    }
    return out;
  }

  private cacheKey(dto: PublicCheckRequestDto, ruleVersion: string): string {
    const content =
      dto.input.type === 'url'
        ? dto.input.url
        : dto.input.type === 'markdown'
          ? dto.input.markdown
          : dto.input.html;
    const hash = createHash('sha256')
      .update(
        JSON.stringify({
          content,
          kw: dto.targetKeyword,
          sk: dto.secondaryKeywords ?? [],
          lang: dto.options?.language ?? 'vi',
          em: dto.options?.enrichMode ?? 'llm',
          rv: ruleVersion,
        }),
      )
      .digest('hex');
    return PUBLIC_API_REDIS_KEYS.publicCheckResponse(hash);
  }

  private async tryGet(key: string): Promise<PublicCheckResponse | null> {
    try {
      const raw = await this.redis.client.get(key);
      return raw ? (JSON.parse(raw) as PublicCheckResponse) : null;
    } catch (e) {
      this.logger.warn(
        `public-check cache read failed key=${key}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
  }

  private async trySet(
    key: string,
    value: PublicCheckResponse,
    ttl: number,
  ): Promise<void> {
    try {
      await this.redis.client.setex(key, ttl, JSON.stringify(value));
    } catch (e) {
      this.logger.warn(
        `public-check cache write failed key=${key}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }
}

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
import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  ContentExtractorService,
  PublicCheckInput,
} from './content-extractor.service';
import { AnalyzerGrpcClient } from '../../infra/grpc/analyzer.client';
import { RedisService } from '../../infra/redis/redis.service';
import { PUBLIC_API_REDIS_KEYS, PUBLIC_API_CACHE_TTL } from '@repo/shared';
import type { PublicCheckRequestDto } from '../dto/public-check-request.dto';
import {
  SuggestionEnricherService,
  type EnrichMode,
  type Suggestion,
} from './suggestion-enricher.service';

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

  constructor(
    private readonly extractor: ContentExtractorService,
    private readonly analyzer: AnalyzerGrpcClient,
    private readonly redis: RedisService,
    private readonly enricher: SuggestionEnricherService,
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

    const cacheKey = this.cacheKey(dto, '1.2.0');
    const cached = await this.tryGet(cacheKey);
    if (cached) {
      cached.meta.cached = true;
      cached.meta.requestId = requestId;
      if (ctx.usage) cached.meta.usage = ctx.usage;
      return cached;
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
    const enrichment = await this.enricher.enrich(
      result.issues,
      {
        apiKeyId: ctx.apiKeyId,
        targetKeyword: dto.targetKeyword,
        secondaryKeywords: dto.secondaryKeywords ?? [],
        language,
        contentExcerpt: extracted.html,
        ruleVersion: result.rule_version,
        contentHash,
      },
      enrichMode,
    );

    let issues: PublicCheckIssue[] = result.issues.map((i, idx) => ({
      ruleId: i.rule_id,
      severity: this.toSeverity(i.severity),
      category: i.category,
      audience: (i.audiences ?? []).filter(
        (a): a is IssueAudience => a === 'writer' || a === 'dev',
      ),
      title: this.shortTitle(i.message),
      description: i.message,
      evidence: i.evidence ?? {},
      suggestion: enrichment.suggestions[idx] ?? null,
      docRef: i.doc_ref || undefined,
    }));

    if (filter) {
      issues = issues.filter((iss) => {
        if (filter.categories && !filter.categories.includes(iss.category)) return false;
        if (filter.audiences && !iss.audience.some((a) => filter.audiences!.includes(a))) return false;
        if (
          filter.minSeverity &&
          SEVERITY_ORDER[iss.severity] < SEVERITY_ORDER[filter.minSeverity]
        ) {
          return false;
        }
        return true;
      });
    }

    const score = this.computeScore(result.issues);
    const scoreBreakdown = this.computeBreakdown(result.issues);

    const response: PublicCheckResponse = {
      score,
      scoreBreakdown,
      issues,
      meta: {
        inputType: dto.input.type,
        resolvedUrl: extracted.resolvedUrl,
        contentStats: {
          words: result.content_stats.word_count,
          characters: result.content_stats.character_count,
          readingTimeSec: result.content_stats.reading_time_sec,
        },
        processingTimeMs: Date.now() - t0,
        ruleVersion: result.rule_version,
        enrichMode,
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
    await this.trySet(cacheKey, response, ttl);

    return response;
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

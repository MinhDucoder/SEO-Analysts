/**
 * @file Enrichment orchestrator for /public/check suggestions.
 *
 * Contract:
 *   enrich(issues, ctx, mode) -> {
 *     suggestions: (Suggestion | null)[] // parallel to issues by index
 *     source:     'none' | 'template' | 'llm' | 'mixed'
 *     degraded:   boolean  // true when LLM was requested but not delivered
 *   }
 *
 * Safety properties:
 *   - Any LLM error (network, guardrail, timeout) maps to template fallback.
 *   - Concurrency bucket full → template fallback (protects Anthropic quota).
 *   - Order preservation: output length = issues.length; a missing LLM entry
 *     is back-filled with the issue's template_suggestion.
 *   - Never throws. Caller gets a response structure even when LLM explodes.
 */
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  PUBLIC_API_REDIS_KEYS,
  PUBLIC_API_CACHE_TTL,
  PUBLIC_API_RATE_LIMITS,
} from '@repo/shared';
import { RedisService } from '../../infra/redis/redis.service';
import { PublicApiRateLimitService } from './public-api-rate-limit.service';
import {
  SeoSuggestChainFactory,
  type SuggestInput,
  type SuggestOutput,
  type SuggestOutputItem,
} from './seo-suggest-chain.factory';

export interface AnalyzerIssue {
  rule_id: string;
  status: string;
  score: number;
  category: string;
  severity: string;
  audiences: string[];
  message: string;
  template_suggestion: string;
  evidence: Record<string, unknown>;
  doc_ref: string;
}

export interface Suggestion {
  type: 'rewrite' | 'add' | 'remove' | 'reorder';
  text: string;
  rationale: string;
}

export interface EnrichContext {
  apiKeyId: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  language: 'vi' | 'en';
  contentExcerpt: string;
  ruleVersion: string;
  contentHash: string;
}

export type EnrichMode = 'off' | 'template' | 'llm';

export interface EnrichResult {
  suggestions: (Suggestion | null)[];
  source: 'none' | 'template' | 'llm' | 'mixed';
  degraded: boolean;
}

const EXCERPT_MAX_CHARS = 8000;

@Injectable()
export class SuggestionEnricherService {
  private readonly logger = new Logger(SuggestionEnricherService.name);

  constructor(
    private readonly chainFactory: SeoSuggestChainFactory,
    private readonly redis: RedisService,
    private readonly rl: PublicApiRateLimitService,
  ) {}

  async enrich(
    issues: AnalyzerIssue[],
    ctx: EnrichContext,
    mode: EnrichMode,
  ): Promise<EnrichResult> {
    if (mode === 'off') {
      return {
        suggestions: issues.map(() => null),
        source: 'none',
        degraded: false,
      };
    }

    const templateSuggestions = issues.map<Suggestion | null>((i) =>
      i.template_suggestion
        ? { type: 'rewrite', text: i.template_suggestion, rationale: '' }
        : null,
    );

    if (mode === 'template') {
      return {
        suggestions: templateSuggestions,
        source: 'template',
        degraded: false,
      };
    }

    // mode === 'llm'
    const cacheKey = this.cacheKey(issues, ctx);
    const cached = await this.readCache(cacheKey);
    if (cached) {
      return this.mergeOutput(issues, cached, templateSuggestions);
    }

    const chain = await this.chainFactory.getOrNull();
    if (!chain) {
      return {
        suggestions: templateSuggestions,
        source: 'template',
        degraded: true,
      };
    }

    const acquired = await this.rl.acquireConcurrency(ctx.apiKeyId);
    if (!acquired) {
      this.logger.warn(
        `LLM concurrency cap hit for apiKeyId=${ctx.apiKeyId} — degrade to template`,
      );
      return {
        suggestions: templateSuggestions,
        source: 'template',
        degraded: true,
      };
    }

    try {
      const input: SuggestInput = {
        targetKeyword: ctx.targetKeyword,
        secondaryKeywords: ctx.secondaryKeywords,
        language: ctx.language,
        contentExcerpt: ctx.contentExcerpt.slice(0, EXCERPT_MAX_CHARS),
        issues: issues.map((i) => ({
          ruleId: i.rule_id,
          category: i.category,
          severity: i.severity,
          message: i.message,
          templateSuggestion: i.template_suggestion,
          evidence: i.evidence ?? {},
        })),
      };

      const out = await chain.run(input, {
        timeoutMs: PUBLIC_API_RATE_LIMITS.LLM_TIMEOUT_MS,
        traceId: cacheKey.slice(-16),
      });

      await this.writeCache(cacheKey, out);
      return this.mergeOutput(issues, out, templateSuggestions);
    } catch (err) {
      this.logger.warn(
        `LLM enrichment failed for apiKeyId=${ctx.apiKeyId}: ${
          err instanceof Error ? err.message : String(err)
        } — degrade to template`,
      );
      return {
        suggestions: templateSuggestions,
        source: 'template',
        degraded: true,
      };
    } finally {
      await this.rl.releaseConcurrency(ctx.apiKeyId);
    }
  }

  private mergeOutput(
    issues: AnalyzerIssue[],
    out: SuggestOutput,
    templateFallback: (Suggestion | null)[],
  ): EnrichResult {
    const byRuleId = new Map<string, SuggestOutputItem[]>();
    for (const item of out) {
      const arr = byRuleId.get(item.ruleId) ?? [];
      arr.push(item);
      byRuleId.set(item.ruleId, arr);
    }
    const pointers = new Map<string, number>();
    let llmCount = 0;
    let templateCount = 0;
    const suggestions = issues.map<Suggestion | null>((iss, idx) => {
      const direct = out[idx];
      if (direct && direct.ruleId === iss.rule_id) {
        llmCount++;
        return { type: direct.type, text: direct.text, rationale: direct.rationale };
      }
      const bucket = byRuleId.get(iss.rule_id);
      if (bucket && bucket.length > 0) {
        const p = pointers.get(iss.rule_id) ?? 0;
        const pick = bucket[p];
        if (pick) {
          pointers.set(iss.rule_id, p + 1);
          llmCount++;
          return { type: pick.type, text: pick.text, rationale: pick.rationale };
        }
      }
      const fallback = templateFallback[idx];
      if (fallback) templateCount++;
      return fallback ?? null;
    });

    const source: EnrichResult['source'] =
      llmCount === 0
        ? templateCount > 0
          ? 'template'
          : 'none'
        : templateCount === 0
          ? 'llm'
          : 'mixed';
    return { suggestions, source, degraded: false };
  }

  private cacheKey(issues: AnalyzerIssue[], ctx: EnrichContext): string {
    const h = createHash('sha256')
      .update(
        JSON.stringify({
          issueIds: issues.map((i) => i.rule_id),
          messages: issues.map((i) => i.message),
          evidence: issues.map((i) => i.evidence ?? {}),
          contentHash: ctx.contentHash,
          kw: ctx.targetKeyword,
          sk: ctx.secondaryKeywords ?? [],
          lang: ctx.language,
          rv: ctx.ruleVersion,
        }),
      )
      .digest('hex');
    return PUBLIC_API_REDIS_KEYS.suggest(h);
  }

  private async readCache(key: string): Promise<SuggestOutput | null> {
    try {
      const raw = await this.redis.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as SuggestOutput;
    } catch (err) {
      this.logger.warn(
        `suggest cache read failed key=${key}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  private async writeCache(key: string, out: SuggestOutput): Promise<void> {
    try {
      await this.redis.client.setex(
        key,
        PUBLIC_API_CACHE_TTL.SUGGEST_SECONDS,
        JSON.stringify(out),
      );
    } catch (err) {
      this.logger.warn(
        `suggest cache write failed key=${key}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}

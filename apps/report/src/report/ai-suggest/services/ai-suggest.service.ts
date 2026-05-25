import { Inject, Injectable, Logger } from '@nestjs/common';
import { CheckStatus } from '@repo/shared';
import type { ILLMProvider, IPromptLoader } from '@repo/seo-ai-core';
import { parseStructured, GuardrailError } from '@repo/seo-ai-core';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { AnalyzeResult } from '../../domain/analyze-result.interface';
import {
  SuggestionsSchema,
  type Suggestion,
  type PersistedAiSuggestions,
} from './suggestion.schema';

const MAX_RULES = 20;
const MODEL_NAME = process.env['SEO_AI_MODEL'] ?? 'claude-haiku-4-5';

export type GenerateStatus = 'generated' | 'already' | 'empty' | 'disabled' | 'failed';

export interface GenerateOutcome {
  status: GenerateStatus;
  suggestions: Suggestion[];
  generatedAt: string | null;
}

// DI tokens for the prompt loader + LLM provider, wired in AiSuggestModule.
export const PROMPT_LOADER = Symbol('AI_SUGGEST_PROMPT_LOADER');
export const LLM_PROVIDER = Symbol('AI_SUGGEST_LLM_PROVIDER');

@Injectable()
export class AiSuggestService {
  private readonly logger = new Logger(AiSuggestService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROMPT_LOADER) private readonly promptLoader: IPromptLoader,
    @Inject(LLM_PROVIDER) private readonly llm: ILLMProvider,
  ) {}

  async generate(auditId: string): Promise<Suggestion[]> {
    const start = Date.now();

    const report = await this.prisma.report.findUnique({ where: { auditId } });
    if (!report) throw new Error(`report not found for auditId=${auditId}`);

    if (process.env['SEO_AI_ENABLED'] !== 'true') {
      this.logger.log(`ai-suggest disabled, marking auditId=${auditId}`);
      await this.persist(report.id, { items: [], model: MODEL_NAME, promptHash: '', error: 'disabled' });
      return [];
    }

    // analysisSnapshot is AnalyzeResult; CheckStatus is lowercase ('fail'|'warn').
    const snap = report.analysisSnapshot as unknown as AnalyzeResult;
    const failing = (snap?.ruleResults ?? [])
      .filter((r) => r.status === CheckStatus.FAIL || r.status === CheckStatus.WARN)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_RULES);

    if (failing.length === 0) {
      await this.persist(report.id, { items: [], model: MODEL_NAME, promptHash: '' });
      this.logger.log(`no failing rules for auditId=${auditId}, persisted empty`);
      return [];
    }

    const rendered = await this.promptLoader.render(
      'seo-rule-suggestions',
      {
        url: report.url,
        failingCount: failing.length,
        failingRulesJson: JSON.stringify(
          failing.map((r) => ({
            ruleId: r.ruleId,
            ruleName: r.ruleName,
            category: r.category,
            status: r.status,
            weight: r.weight,
            message: r.message,
          })),
        ),
      },
      { version: '^1.0.0' },
    );

    let res;
    try {
      res = await this.llm.invoke({ messages: rendered.messages });
    } catch (err) {
      this.logger.error(`LLM invoke failed for auditId=${auditId}: ${(err as Error).message}`);
      await this.persist(report.id, { items: [], model: MODEL_NAME, promptHash: rendered.hash, error: 'llm_failed' });
      throw err;
    }

    try {
      const parsed = parseStructured(res.content, SuggestionsSchema);
      await this.persist(report.id, {
        items: parsed.suggestions,
        model: MODEL_NAME,
        promptHash: rendered.hash,
      });
      this.logger.log(
        `auditId=${auditId} generated ${parsed.suggestions.length} suggestions in ${Date.now() - start}ms`,
      );
      return parsed.suggestions;
    } catch (err) {
      if (err instanceof GuardrailError) {
        this.logger.warn(`auditId=${auditId} guardrail failed, persisting parse_failed marker`);
        await this.persist(report.id, {
          items: [],
          model: MODEL_NAME,
          promptHash: rendered.hash,
          error: 'parse_failed',
        });
        return [];
      }
      throw err;
    }
  }

  /**
   * Idempotent, on-demand entry point used by the gateway (sync gRPC). Returns
   * a status the gateway maps to HTTP + quota: only `generated` consumes a
   * lượt. A prior successful run (generatedAt set, no error marker) short-
   * circuits as `already` — never re-runs the LLM. Prior disabled/failed
   * markers do NOT lock; they allow a retry.
   */
  async generateOnce(auditId: string): Promise<GenerateOutcome> {
    const existing = await this.prisma.report.findUnique({ where: { auditId } });
    if (!existing) throw new Error(`report not found for auditId=${auditId}`);
    const prior = existing.aiSuggestions as unknown as PersistedAiSuggestions | null;
    if (prior?.generatedAt && !prior.error) {
      return { status: 'already', suggestions: prior.items ?? [], generatedAt: prior.generatedAt };
    }

    try {
      await this.generate(auditId);
    } catch {
      // generate() persists an 'llm_failed' marker before rethrowing; classify
      // from the freshly-read column below.
    }

    const fresh = await this.prisma.report.findUnique({ where: { auditId } });
    const ai = (fresh?.aiSuggestions as unknown as PersistedAiSuggestions | null) ?? null;
    if (!ai) return { status: 'failed', suggestions: [], generatedAt: null };
    if (ai.error === 'disabled') return { status: 'disabled', suggestions: [], generatedAt: ai.generatedAt };
    if (ai.error === 'llm_failed' || ai.error === 'parse_failed') {
      return { status: 'failed', suggestions: [], generatedAt: ai.generatedAt };
    }
    const items = ai.items ?? [];
    return {
      status: items.length > 0 ? 'generated' : 'empty',
      suggestions: items,
      generatedAt: ai.generatedAt,
    };
  }

  private async persist(reportId: string, partial: Omit<PersistedAiSuggestions, 'generatedAt'>): Promise<void> {
    const aiSuggestions: PersistedAiSuggestions = {
      ...partial,
      generatedAt: new Date().toISOString(),
    };
    await this.prisma.report.update({
      where: { id: reportId },
      data: { aiSuggestions: aiSuggestions as unknown as object },
    });
  }
}

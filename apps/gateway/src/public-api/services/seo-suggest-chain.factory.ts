/**
 * @file Lazy factory for the batched SEO-suggest chain. Returns null
 * when AI is disabled (`SEO_AI_ENABLED` not "true") or when the chosen
 * provider fails to initialise (e.g. missing key) so the caller can
 * degrade gracefully to template suggestions. Otherwise builds the chain
 * once and caches it.
 *
 * Provider is config-driven (`SEO_AI_PROVIDER`, default Gemini) — mirrors
 * the report service's `ai-suggest` wiring so one env set drives both.
 *
 * Test-only: accept an `llmOverride` to inject a stub ILLMProvider
 * without requiring a live key in unit tests.
 */
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  createBaseChain,
  FileSystemPromptLoader,
  parseStructured,
  createLLM,
  type ILLMProvider,
  type IChain,
} from '@repo/seo-ai-core';

export interface SuggestIssueInput {
  ruleId: string;
  category: string;
  severity: string;
  message: string;
  templateSuggestion: string;
  evidence: Record<string, unknown>;
}

export interface SuggestInput {
  targetKeyword: string;
  secondaryKeywords?: string[];
  language: 'vi' | 'en';
  contentExcerpt: string;
  issues: SuggestIssueInput[];
}

export interface SuggestOutputItem {
  ruleId: string;
  type: 'rewrite' | 'add' | 'remove' | 'reorder';
  text: string;
  rationale: string;
}
export type SuggestOutput = SuggestOutputItem[];

const OutputSchema = z.array(
  z.object({
    ruleId: z.string(),
    type: z.enum(['rewrite', 'add', 'remove', 'reorder']),
    text: z.string().min(1).max(500),
    rationale: z.string().min(1).max(300),
  }),
);

export interface SeoSuggestChainFactoryOptions {
  promptsDir: string;
  /** SEO_AI_ENABLED kill switch. When false, enrichment degrades to template. */
  enabled: boolean;
  /** LLM provider routed into createLLM (config-driven; default Gemini in the module). */
  provider: 'anthropic' | 'gemini';
  /** Provider API key (GEMINI_API_KEY or ANTHROPIC_API_KEY). */
  apiKey: string | undefined;
  model: string;
  defaultMaxTokens?: number;
  /** Test seam — inject a stub ILLMProvider to avoid real API calls in unit tests. */
  llmOverride?: ILLMProvider;
}

@Injectable()
export class SeoSuggestChainFactory {
  private readonly logger = new Logger(SeoSuggestChainFactory.name);
  private chainCache: IChain<SuggestInput, SuggestOutput> | null | undefined;

  constructor(private readonly opts: SeoSuggestChainFactoryOptions) {}

  async getOrNull(): Promise<IChain<SuggestInput, SuggestOutput> | null> {
    if (this.chainCache !== undefined) return this.chainCache;
    if (!this.opts.llmOverride && !this.opts.enabled) {
      this.logger.warn(
        'SEO_AI_ENABLED is not "true" — LLM enrichment disabled; will degrade to template.',
      );
      this.chainCache = null;
      return null;
    }
    let llm: ILLMProvider;
    try {
      llm =
        this.opts.llmOverride ??
        createLLM({
          provider: this.opts.provider,
          apiKey: this.opts.apiKey,
          model: this.opts.model,
          defaultMaxTokens: this.opts.defaultMaxTokens ?? 2048,
          defaultTemperature: 0.2,
        });
    } catch (e) {
      // Missing/invalid provider key, unknown provider, etc. Preserve the
      // degrade-to-template contract instead of failing the whole request.
      this.logger.warn(
        `LLM init failed (${e instanceof Error ? e.message : String(e)}) — degrading to template.`,
      );
      this.chainCache = null;
      return null;
    }
    const loader = new FileSystemPromptLoader({ baseDir: this.opts.promptsDir });

    this.chainCache = createBaseChain<SuggestInput, SuggestOutput>({
      name: 'seo-suggest',
      promptId: 'suggest-fix-seo',
      promptVersion: '1.0.0',
      retries: 2,
      run: async (input: SuggestInput, ctx) => {
        const { messages, hash } = await loader.render(
          'suggest-fix-seo',
          {
            targetKeyword: input.targetKeyword,
            secondaryKeywords: (input.secondaryKeywords ?? []).join(', '),
            language: input.language,
            contentExcerpt: input.contentExcerpt,
            issueCount: input.issues.length,
            issues: input.issues.map((i: SuggestIssueInput) => ({
              ruleId: i.ruleId,
              category: i.category,
              severity: i.severity,
              message: i.message,
              templateSuggestion: i.templateSuggestion,
              evidenceJson: JSON.stringify(i.evidence ?? {}),
            })),
          },
          { version: '^1.0.0' },
        );
        this.logger.debug(
          `suggest render promptHash=${hash} issueCount=${input.issues.length}`,
        );
        const res = await llm.invoke({ messages, metadata: { promptHash: hash } }, ctx.signal);
        return parseStructured(res.content, OutputSchema);
      },
    });
    return this.chainCache;
  }
}

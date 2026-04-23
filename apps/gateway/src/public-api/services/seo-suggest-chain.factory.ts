/**
 * @file Lazy factory for the batched SEO-suggest chain. Returns null
 * when the Anthropic API key is absent so the caller can degrade
 * gracefully. Otherwise builds `BaseChain` once and caches it.
 *
 * Test-only: accept an `llmOverride` to inject a stub `ILLM` without
 * requiring a live key in unit tests.
 */
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseChain,
  FileSystemPromptLoader,
  ZodOutputParser,
  createLLM,
  type ILLM,
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
  apiKey: string | undefined;
  model: string;
  defaultMaxTokens?: number;
  /** Test seam — inject a stub ILLM to avoid real API calls in unit tests. */
  llmOverride?: ILLM;
}

@Injectable()
export class SeoSuggestChainFactory {
  private readonly logger = new Logger(SeoSuggestChainFactory.name);
  private chainCache: BaseChain<SuggestInput, SuggestOutput> | null | undefined;

  constructor(private readonly opts: SeoSuggestChainFactoryOptions) {}

  async getOrNull(): Promise<BaseChain<SuggestInput, SuggestOutput> | null> {
    if (this.chainCache !== undefined) return this.chainCache;
    if (!this.opts.apiKey && !this.opts.llmOverride) {
      this.logger.warn(
        'ANTHROPIC_API_KEY not set — LLM enrichment disabled; will degrade to template.',
      );
      this.chainCache = null;
      return null;
    }
    const llm =
      this.opts.llmOverride ??
      createLLM({
        provider: 'anthropic',
        apiKey: this.opts.apiKey,
        model: this.opts.model,
        defaultMaxTokens: this.opts.defaultMaxTokens ?? 2048,
        defaultTemperature: 0.2,
      });
    const loader = new FileSystemPromptLoader({ baseDir: this.opts.promptsDir });
    const parser = new ZodOutputParser(OutputSchema);

    this.chainCache = new BaseChain<SuggestInput, SuggestOutput>({
      name: 'seo-suggest',
      retry: { maxAttempts: 2, backoffMs: 500 },
      run: async (input, { signal }) => {
        const { messages, hash } = await loader.render(
          'suggest-fix-seo',
          {
            targetKeyword: input.targetKeyword,
            secondaryKeywords: (input.secondaryKeywords ?? []).join(', '),
            language: input.language,
            contentExcerpt: input.contentExcerpt,
            issueCount: input.issues.length,
            issues: input.issues.map((i) => ({
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
        const res = await llm.invoke({ messages, metadata: { promptHash: hash } }, signal);
        return parser.parse(res.content);
      },
    });
    return this.chainCache;
  }
}

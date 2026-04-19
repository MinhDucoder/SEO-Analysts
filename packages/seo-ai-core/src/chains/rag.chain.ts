import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import type { IChain, ChainContext } from './types.js';
import type { ILLMProvider } from '../llm/types.js';
import type { IPromptLoader } from '../prompt/types.js';
import type { IRetriever, RetrievedDoc } from '../retrievers/types.js';
import { createBaseChain } from './base.chain.js';
import { parseStructured } from '../guardrails/output-parser.js';
import { RetrieverError } from '../errors/index.js';

export interface RagChainConfig<TInput, S extends ZodTypeAny> {
  name: string;
  promptId: string;
  promptVersion: string;
  retriever: IRetriever;
  llm: ILLMProvider;
  promptLoader: IPromptLoader;
  outputSchema: S;
  /**
   * Map (input, retrieved-context-string) → variables passed to the prompt
   * template. The library does NOT auto-inject; consumers know best how to
   * shape the context for their template.
   */
  buildVariables: (input: TInput, contextDocs: string) => Record<string, unknown>;
  /**
   * How to derive the retriever query from input. Defaults to `input.query`
   * (requires TInput to extend `{ query: string }`).
   */
  buildQuery?: (input: TInput) => string;
  topK?: number;
  retries?: number;
}

export function createRagChain<TInput, S extends ZodTypeAny>(
  cfg: RagChainConfig<TInput, S>,
): IChain<TInput, ZodInfer<S>> {
  const buildQuery = cfg.buildQuery ?? ((input: TInput) => (input as { query: string }).query);

  return createBaseChain({
    name: cfg.name,
    promptId: cfg.promptId,
    promptVersion: cfg.promptVersion,
    retries: cfg.retries,
    run: async (input: TInput, ctx: ChainContext): Promise<ZodInfer<S>> => {
      let docs: RetrievedDoc[];
      try {
        docs = await cfg.retriever.search(buildQuery(input), { topK: cfg.topK ?? 5 });
      } catch (err) {
        throw new RetrieverError(`Retriever failed: ${(err as Error).message}`, { cause: err });
      }
      const contextDocs = docs
        .map((d, i) => `[doc#${i + 1} score=${d.score.toFixed(3)}] ${d.content}`)
        .join('\n\n');

      const rendered = await cfg.promptLoader.render(
        cfg.promptId,
        cfg.buildVariables(input, contextDocs),
        { version: cfg.promptVersion },
      );

      const response = await cfg.llm.invoke(
        { messages: rendered.messages, metadata: { promptHash: rendered.hash } },
        ctx.signal,
      );

      return parseStructured(response.content, cfg.outputSchema);
    },
  });
}

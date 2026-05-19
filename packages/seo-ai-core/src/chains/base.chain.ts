import type { IChain, ChainContext } from './types.js';
import { ChainError, LLMError, AiCoreError } from '../errors/index.js';
import { noopLogger } from '../observability/logger.js';

export interface BaseChainConfig<TInput, TOutput> {
  name: string;
  promptId: string;
  promptVersion: string;
  run: (input: TInput, ctx: ChainContext) => Promise<TOutput>;
  /** Max retries on transient LLMError. Default 1. Set to 0 to disable. */
  retries?: number;
}

export function createBaseChain<TInput, TOutput>(
  cfg: BaseChainConfig<TInput, TOutput>,
): IChain<TInput, TOutput> {
  const retries = cfg.retries ?? 1;

  return {
    name: cfg.name,
    promptId: cfg.promptId,
    promptVersion: cfg.promptVersion,

    async invoke(input: TInput, ctx: ChainContext = {}): Promise<TOutput> {
      const logger = ctx.logger ?? noopLogger;
      const traceId = ctx.traceId;
      const meta = { traceId, chain: cfg.name, promptId: cfg.promptId, promptVersion: cfg.promptVersion };

      logger.info('chain.start', { ...meta, ...ctx.metadata });
      ctx.callbacks?.onStart?.(input);

      let attempt = 0;
      let lastError: unknown;
      while (attempt <= retries) {
        try {
          const out = await cfg.run(input, ctx);
          logger.info('chain.success', { ...meta, attempt });
          ctx.callbacks?.onSuccess?.(out);
          return out;
        } catch (err) {
          lastError = err;
          // Only retry on LLMError (network / rate-limit / transient).
          // GuardrailError, PromptError, RetrieverError → deterministic; retry won't help.
          if (err instanceof LLMError && attempt < retries) {
            attempt += 1;
            logger.warn('chain.retry', { ...meta, attempt, reason: (err as Error).message });
            continue;
          }
          break;
        }
      }

      logger.error('chain.failed', { ...meta, error: (lastError as Error)?.message });
      ctx.callbacks?.onError?.(lastError);

      if (lastError instanceof AiCoreError) throw lastError;
      throw new ChainError(
        `Chain "${cfg.name}" failed: ${(lastError as Error)?.message ?? String(lastError)}`,
        { cause: lastError instanceof Error ? lastError : undefined },
      );
    },
  };
}

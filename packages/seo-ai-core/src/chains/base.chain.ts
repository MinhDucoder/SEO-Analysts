import type { IChain, ChainContext } from './types.js';
import { ChainError, LLMError, AiCoreError } from '../errors/index.js';
import { noopLogger, type Logger } from '../observability/logger.js';

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

// ─── Class-based API (used by consumers that need timeoutMs + AbortController)
// Wraps an inner async function with retry, timeout, logger.child(traceId) and
// ChainError mapping. Sister to createBaseChain() — that factory targets RAG
// pipelines that already plumb their own AbortSignal; this class targets
// orchestration code (e.g. apps/gateway) that wants timeout enforcement at the
// chain boundary.

export interface BaseChainRunContext {
  signal?: AbortSignal;
  traceId?: string;
  logger?: Logger;
}

export interface BaseChainOptions<TInput, TOutput> {
  name: string;
  run: (input: TInput, ctx: BaseChainRunContext) => Promise<TOutput>;
  /** Retry config. `maxAttempts` includes the first try. Default: { maxAttempts: 1 } */
  retry?: { maxAttempts: number; backoffMs?: number };
  /** Optional logger used when caller does not pass one in run(). */
  logger?: Logger;
}

export interface BaseChainRunOptions {
  /** Hard timeout in ms — fires AbortController, run() rejects with ChainError. */
  timeoutMs?: number;
  /** Correlation id forwarded into logger.child({ traceId }) when available. */
  traceId?: string;
  /** Override logger for this single call. */
  logger?: Logger;
  /** External AbortSignal — composed with timeoutMs into a single signal. */
  signal?: AbortSignal;
}

export class BaseChain<TInput, TOutput> {
  readonly name: string;
  private readonly runFn: BaseChainOptions<TInput, TOutput>['run'];
  private readonly maxAttempts: number;
  private readonly backoffMs: number;
  private readonly defaultLogger: Logger;

  constructor(opts: BaseChainOptions<TInput, TOutput>) {
    this.name = opts.name;
    this.runFn = opts.run;
    this.maxAttempts = Math.max(1, opts.retry?.maxAttempts ?? 1);
    this.backoffMs = opts.retry?.backoffMs ?? 0;
    this.defaultLogger = opts.logger ?? noopLogger;
  }

  async run(input: TInput, runOpts: BaseChainRunOptions = {}): Promise<TOutput> {
    const baseLogger = runOpts.logger ?? this.defaultLogger;
    const logger =
      runOpts.traceId && typeof baseLogger.child === 'function'
        ? baseLogger.child({ traceId: runOpts.traceId })
        : baseLogger;

    const ac = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    if (runOpts.timeoutMs && runOpts.timeoutMs > 0) {
      timeoutHandle = setTimeout(() => ac.abort(), runOpts.timeoutMs);
    }
    if (runOpts.signal) {
      if (runOpts.signal.aborted) ac.abort();
      else runOpts.signal.addEventListener('abort', () => ac.abort());
    }

    const ctx: BaseChainRunContext = {
      signal: ac.signal,
      traceId: runOpts.traceId,
      logger,
    };
    const meta = { chain: this.name, traceId: runOpts.traceId };

    logger.info('chain.start', meta);

    let attempt = 0;
    let lastError: unknown;
    while (attempt < this.maxAttempts) {
      try {
        const out = await this.runFn(input, ctx);
        logger.info('chain.success', { ...meta, attempt });
        if (timeoutHandle) clearTimeout(timeoutHandle);
        return out;
      } catch (err) {
        lastError = err;
        const canRetry =
          err instanceof LLMError &&
          err.retriable === true &&
          attempt + 1 < this.maxAttempts;
        if (!canRetry) break;
        attempt += 1;
        logger.warn('chain.retry', {
          ...meta,
          attempt,
          reason: (err as Error).message,
        });
        if (this.backoffMs > 0) {
          await new Promise((res) => setTimeout(res, this.backoffMs));
        }
      }
    }

    if (timeoutHandle) clearTimeout(timeoutHandle);
    logger.error('chain.failed', {
      ...meta,
      error: (lastError as Error)?.message,
    });

    const cause = lastError instanceof Error ? lastError : undefined;
    const msg = (lastError as Error)?.message ?? String(lastError);
    throw new ChainError(`Chain "${this.name}" failed: ${msg}`, { cause });
  }
}

/**
 * @file Hub wrapper for every chain in this package. Provides:
 *   - Retry on retriable LLMError only (GuardrailError/PromptError
 *     are deterministic; retry wastes cost).
 *   - Timeout via AbortController (linked to any incoming signal so
 *     the caller can cancel earlier).
 *   - Structured logger start/success/fail events.
 *   - Error normalization — anything non-ChainError/Error gets
 *     wrapped in ChainError before rethrow.
 */
import { isTransientLLMError, ChainError, AiCoreError } from '../errors';
import type { ChainContext, IChain, RetryPolicy } from './types';
import { noopLogger, type Logger } from '../observability/logger';

export interface BaseChainOptions<TIn, TOut> {
  name: string;
  run: (
    input: TIn,
    internal: { signal?: AbortSignal; traceId?: string },
  ) => Promise<TOut>;
  retry?: RetryPolicy;
  logger?: Logger;
}

export class BaseChain<TIn, TOut> implements IChain<TIn, TOut> {
  readonly name: string;
  private readonly runFn: BaseChainOptions<TIn, TOut>['run'];
  private readonly retry: Required<RetryPolicy>;
  private readonly baseLogger: Logger;

  constructor(opts: BaseChainOptions<TIn, TOut>) {
    this.name = opts.name;
    this.runFn = opts.run;
    this.retry = {
      maxAttempts: opts.retry?.maxAttempts ?? 1,
      backoffMs: opts.retry?.backoffMs ?? 250,
    };
    this.baseLogger = opts.logger ?? noopLogger;
  }

  async run(input: TIn, ctx: ChainContext = {}): Promise<TOut> {
    const logger = this.scopedLogger(ctx);
    const timeoutCtl = new AbortController();
    const linkedSignal = this.linkSignals(ctx.signal, timeoutCtl.signal);
    const timer = ctx.timeoutMs
      ? setTimeout(
          () => timeoutCtl.abort(new Error(`timeout ${ctx.timeoutMs}ms`)),
          ctx.timeoutMs,
        )
      : undefined;

    const startedAt = Date.now();
    logger.info({ chain: this.name, event: 'start' });

    let lastErr: unknown;
    try {
      for (let attempt = 1; attempt <= this.retry.maxAttempts; attempt++) {
        try {
          const out = await this.runFn(input, {
            signal: linkedSignal,
            traceId: ctx.traceId,
          });
          logger.info({
            chain: this.name,
            event: 'success',
            durationMs: Date.now() - startedAt,
            attempt,
          });
          return out;
        } catch (err) {
          lastErr = err;
          if (attempt < this.retry.maxAttempts && isTransientLLMError(err)) {
            logger.warn({
              chain: this.name,
              event: 'retry',
              attempt,
              err: serializeErr(err),
            });
            await new Promise((r) => setTimeout(r, this.retry.backoffMs * attempt));
            continue;
          }
          throw err;
        }
      }
      throw lastErr ?? new ChainError(`${this.name}: exhausted retries`);
    } catch (err) {
      logger.error({
        chain: this.name,
        event: 'fail',
        durationMs: Date.now() - startedAt,
        err: serializeErr(err),
      });
      if (err instanceof ChainError) throw err;
      throw new ChainError(
        err instanceof Error ? err.message : `${this.name} failed`,
        {
          cause: err,
          retriable: err instanceof AiCoreError ? err.retriable : false,
        },
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private scopedLogger(ctx: ChainContext): Logger {
    const log = ctx.logger ?? this.baseLogger;
    if (ctx.traceId && log.child) {
      return log.child({ traceId: ctx.traceId, chain: this.name });
    }
    return log;
  }

  private linkSignals(a: AbortSignal | undefined, b: AbortSignal): AbortSignal {
    if (!a) return b;
    const ctl = new AbortController();
    const onAbort = (): void => ctl.abort();
    a.addEventListener('abort', onAbort);
    b.addEventListener('abort', onAbort);
    if (a.aborted || b.aborted) ctl.abort();
    return ctl.signal;
  }
}

function serializeErr(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { err: String(err) };
}

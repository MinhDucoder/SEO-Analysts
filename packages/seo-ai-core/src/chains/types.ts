import type { Logger } from '../observability/logger.js';

export interface ChainCallbacks {
  onStart?: (input: unknown) => void;
  onSuccess?: (output: unknown) => void;
  onError?: (err: unknown) => void;
}

export interface ChainContext {
  /** Correlation id for tracing across multiple calls. */
  traceId?: string;
  signal?: AbortSignal;
  logger?: Logger;
  callbacks?: ChainCallbacks;
  /** User-defined metadata propagated to logger context. */
  metadata?: Record<string, unknown>;
}

export interface IChain<TInput, TOutput> {
  readonly name: string;
  readonly promptId: string;
  readonly promptVersion: string;
  invoke(input: TInput, ctx?: ChainContext): Promise<TOutput>;
}

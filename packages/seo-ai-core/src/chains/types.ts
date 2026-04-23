import type { Logger } from '../observability/logger';

export interface ChainContext {
  traceId?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  logger?: Logger;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs?: number;
}

export interface IChain<TIn, TOut> {
  readonly name: string;
  run(input: TIn, ctx?: ChainContext): Promise<TOut>;
}

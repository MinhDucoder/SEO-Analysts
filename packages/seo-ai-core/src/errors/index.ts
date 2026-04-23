/**
 * @file Error taxonomy for @repo/seo-ai-core. `instanceof` is the
 * intended API for consumers deciding retry vs fail. `retriable` drives
 * the BaseChain retry policy.
 */

export abstract class AiCoreError extends Error {
  readonly cause?: unknown;
  readonly retriable: boolean;
  constructor(message: string, opts?: { cause?: unknown; retriable?: boolean }) {
    super(message);
    this.name = new.target.name;
    this.cause = opts?.cause;
    this.retriable = opts?.retriable ?? false;
  }
}

export class LLMError extends AiCoreError {
  constructor(message: string, opts?: { cause?: unknown; retriable?: boolean }) {
    super(message, { cause: opts?.cause, retriable: opts?.retriable ?? true });
  }
}

export class PromptError extends AiCoreError {
  constructor(message: string, opts?: { cause?: unknown }) {
    super(message, { cause: opts?.cause, retriable: false });
  }
}

export class GuardrailError extends AiCoreError {
  readonly raw?: string;
  constructor(message: string, opts?: { cause?: unknown; raw?: string }) {
    super(message, { cause: opts?.cause, retriable: false });
    this.raw = opts?.raw;
  }
}

export class ChainError extends AiCoreError {
  constructor(message: string, opts?: { cause?: unknown; retriable?: boolean }) {
    super(message, { cause: opts?.cause, retriable: opts?.retriable ?? false });
  }
}

export function isTransientLLMError(err: unknown): boolean {
  return err instanceof LLMError && err.retriable === true;
}

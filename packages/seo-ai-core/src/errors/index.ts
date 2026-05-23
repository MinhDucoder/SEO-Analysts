export interface AiCoreErrorOptions extends ErrorOptions {
  /** Original LLM raw payload that failed to parse. Useful for debugging. */
  raw?: string;
  /**
   * When true, BaseChain.run() treats the error as transient and consumes
   * a retry attempt. GuardrailError / PromptError are deterministic and
   * default to false. LLMError network failures default to true.
   */
  retriable?: boolean;
}

export class AiCoreError extends Error {
  readonly raw?: string;
  readonly retriable: boolean;

  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'AiCoreError';
    this.raw = opts?.raw;
    this.retriable = opts?.retriable ?? false;
  }
}

export class LLMError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'LLMError';
  }
}

export class PromptError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'PromptError';
  }
}

export class ChainError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'ChainError';
  }
}

export class GuardrailError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'GuardrailError';
  }
}

export class RetrieverError extends AiCoreError {
  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'RetrieverError';
  }
}

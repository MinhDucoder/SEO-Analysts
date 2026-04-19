export interface AiCoreErrorOptions extends ErrorOptions {
  /** Original LLM raw payload that failed to parse. Useful for debugging. */
  raw?: string;
}

export class AiCoreError extends Error {
  readonly raw?: string;

  constructor(message: string, opts?: AiCoreErrorOptions) {
    super(message, opts);
    this.name = 'AiCoreError';
    this.raw = opts?.raw;
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

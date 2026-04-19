export interface Policy {
  /** Hard cap on `LLMRequest.maxTokens`. Caller request is clamped down, never up. */
  maxTokens?: number;
  /** Hard cap on number of messages allowed in `LLMRequest.messages`. */
  maxMessages?: number;
  /** Regex sources (with flags) applied to message content. Matches replaced with `[REDACTED]`. */
  redactPatterns?: Array<{ source: string; flags: string }>;
}

export interface PolicyResult {
  applied: boolean;
  /** Diagnostic — what the policy changed. Useful for observability. */
  changes: string[];
}

export interface OutputParseSuccess<T> {
  ok: true;
  value: T;
}

export interface OutputParseFailure {
  ok: false;
  error: string;
  raw: string;
}

export type OutputParseResult<T> = OutputParseSuccess<T> | OutputParseFailure;

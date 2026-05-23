export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
  /** Optional name (function/tool name for tool messages). */
  name?: string;
  /** Tool-call correlation id (when role === 'tool'). */
  toolCallId?: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export type FinishReason = 'stop' | 'length' | 'tool_call' | 'content_filter' | 'unknown';

export interface LLMRequest {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  /** Free-form metadata propagated to observability hooks. NOT sent to the LLM. */
  metadata?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finishReason: FinishReason;
  /**
   * Provider raw payload. Available for adapter debugging but NOT a stable API —
   * shape varies per provider and may be removed in a future major version.
   * Consumers should rely on `content`, `usage`, `finishReason` instead.
   */
  raw?: unknown;
}

export interface LLMChunk {
  delta: string;
  /** Final usage delivered on the last chunk only. */
  usage?: TokenUsage;
}

/**
 * Minimal LLM contract — what consumers (chains, parsers) actually call.
 * Real adapters implement the richer `ILLMProvider`, but factories accept
 * `ILLM` so tests can pass small stubs.
 */
export interface ILLM {
  readonly providerId: string;
  readonly modelId: string;
  invoke(req: LLMRequest, signal?: AbortSignal): Promise<LLMResponse>;
}

export interface ILLMProvider extends ILLM {
  readonly name: string;
  readonly model: string;
  stream(req: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMChunk>;
  countTokens(text: string): Promise<number>;
}

/**
 * @file Provider-agnostic LLM interface. Consumers only see this
 * surface; no @langchain/* type ever leaks across the public API.
 */

export type Role = 'system' | 'user' | 'assistant';

export interface Message {
  role: Role;
  content: string;
}

export interface LLMRequest {
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'tool_call' | 'content_filter' | 'unknown';
  usage: { inputTokens: number; outputTokens: number };
  raw?: unknown;
}

export interface ILLM {
  readonly providerId: string;
  readonly modelId: string;
  invoke(req: LLMRequest, signal?: AbortSignal): Promise<LLMResponse>;
}

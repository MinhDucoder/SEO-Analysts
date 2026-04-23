/**
 * @file Mapper between provider-neutral Message[] and LangChain
 * BaseMessage[]. Isolating this prevents LangChain's AIMessage from
 * leaking into `LLMResponse.raw` path naturally consumed by callers.
 */
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  type BaseMessage,
  type AIMessageChunk,
} from '@langchain/core/messages';
import type { Message, LLMResponse } from '../types';

export function toBaseMessages(messages: Message[]): BaseMessage[] {
  return messages.map((m) => {
    switch (m.role) {
      case 'system':
        return new SystemMessage(m.content);
      case 'user':
        return new HumanMessage(m.content);
      case 'assistant':
        return new AIMessage(m.content);
    }
  });
}

export function toLLMResponse(msg: AIMessageChunk | AIMessage): LLMResponse {
  const c = msg.content;
  const text =
    typeof c === 'string'
      ? c
      : Array.isArray(c)
        ? c
            .map((block: unknown) =>
              typeof block === 'object' && block !== null && 'text' in block
                ? (block as { text: string }).text
                : '',
            )
            .join('')
        : '';

  const metadata =
    (msg as { response_metadata?: Record<string, unknown> }).response_metadata ?? {};
  const usageMeta =
    (msg as { usage_metadata?: { input_tokens?: number; output_tokens?: number } }).usage_metadata ?? {};

  const stopReason = (metadata['stop_reason'] as string | undefined) ?? 'unknown';
  const finishReason: LLMResponse['finishReason'] = ((): LLMResponse['finishReason'] => {
    switch (stopReason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_call';
      case 'content_filtered':
        return 'content_filter';
      default:
        return 'unknown';
    }
  })();

  return {
    content: text,
    finishReason,
    usage: {
      inputTokens: usageMeta.input_tokens ?? 0,
      outputTokens: usageMeta.output_tokens ?? 0,
    },
    raw: msg,
  };
}

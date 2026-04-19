import {
  AIMessage, HumanMessage, SystemMessage, ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import type { Message, LLMResponse, FinishReason, TokenUsage } from '../types.js';

export function toLangChainMessages(messages: Message[]): BaseMessage[] {
  return messages.map((m) => {
    switch (m.role) {
      case 'system':
        return new SystemMessage({ content: m.content });
      case 'user':
        return new HumanMessage({ content: m.content, name: m.name });
      case 'assistant':
        return new AIMessage({ content: m.content, name: m.name });
      case 'tool':
        return new ToolMessage({
          content: m.content,
          tool_call_id: m.toolCallId ?? '',
          name: m.name,
        });
    }
  });
}

interface AnthropicUsageMetadata {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export function toLLMResponse(ai: AIMessage, model: string): LLMResponse {
  const usage = (ai.usage_metadata ?? {}) as AnthropicUsageMetadata;
  const tokenUsage: TokenUsage = {
    prompt: usage.input_tokens ?? 0,
    completion: usage.output_tokens ?? 0,
    total: usage.total_tokens ?? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
  };
  const content = typeof ai.content === 'string'
    ? ai.content
    : ai.content.map((c) => (typeof c === 'string' ? c : 'text' in c ? c.text : '')).join('');

  const finishReason: FinishReason = mapFinishReason(
    ai.response_metadata?.['stop_reason'] as string | undefined,
  );

  return {
    content,
    usage: tokenUsage,
    model,
    finishReason,
    raw: ai,
  };
}

function mapFinishReason(s: string | undefined): FinishReason {
  switch (s) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_call';
    default:
      return 'unknown';
  }
}

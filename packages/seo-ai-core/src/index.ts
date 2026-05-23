// Public type surface — locked for MVP per spec § 3.

export type {
  ILLM, ILLMProvider, LLMRequest, LLMResponse, Message, TokenUsage, LLMChunk, FinishReason, Role,
} from './llm/types.js';
export type {
  IPromptLoader, PromptTemplate, RenderedPrompt, PromptListEntry, PromptMetadata, PromptExample,
} from './prompt/types.js';
export type { IChain, ChainContext, ChainCallbacks } from './chains/types.js';
export type { IRetriever, RetrievedDoc, RetrieverSearchOptions } from './retrievers/types.js';
export type { Policy, PolicyResult, OutputParseResult } from './guardrails/types.js';
export type { Logger, LogContext, PinoLike } from './observability/logger.js';

export { noopLogger, createPinoLogger } from './observability/logger.js';

export {
  AiCoreError, LLMError, PromptError, ChainError, GuardrailError, RetrieverError,
  type AiCoreErrorOptions,
} from './errors/index.js';

// Factories + classes appended in T4-T9.

// LLM
export { createLLM, registerLLMProvider, type LLMConfig, type LLMProviderName } from './llm/provider.js';
export { AnthropicAdapter } from './llm/adapters/anthropic.adapter.js';
export { GeminiAdapter } from './llm/adapters/gemini.adapter.js';

// Prompt
export { FileSystemPromptLoader, type PromptLoaderOptions } from './prompt/loader.js';
export { renderTemplate } from './prompt/renderer.js';

// Retrievers
export { MemoryRetriever, type MemoryDoc } from './retrievers/memory.retriever.js';

// Guardrails
export { parseStructured, ZodOutputParser } from './guardrails/output-parser.js';
export { applyPolicy, type ApplyPolicyOutput } from './guardrails/policy.js';

// Chains
export {
  createBaseChain, type BaseChainConfig,
  BaseChain, type BaseChainOptions, type BaseChainRunOptions, type BaseChainRunContext,
} from './chains/base.chain.js';
export { createRagChain, type RagChainConfig } from './chains/rag.chain.js';

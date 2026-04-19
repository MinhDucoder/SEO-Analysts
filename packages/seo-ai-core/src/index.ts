// Public type surface — locked for MVP per spec § 3.

export type {
  ILLMProvider, LLMRequest, LLMResponse, Message, TokenUsage, LLMChunk, FinishReason, Role,
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

// Prompt
export { FileSystemPromptLoader, type PromptLoaderOptions } from './prompt/loader.js';
export { renderTemplate } from './prompt/renderer.js';

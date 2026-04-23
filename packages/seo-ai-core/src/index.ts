/**
 * @file Public API of @repo/seo-ai-core.
 * Consumers MUST only import from this barrel — never deep paths.
 */

export {
  AiCoreError,
  LLMError,
  PromptError,
  GuardrailError,
  ChainError,
  isTransientLLMError,
} from './errors';

export { noopLogger, consoleLogger } from './observability/logger';
export type { Logger, LogFields } from './observability/logger';

export { createLLM, registerLLMProvider } from './llm/provider';
export type { LLMProviderId, CreateLLMOptions } from './llm/provider';
export type { ILLM, LLMRequest, LLMResponse, Message, Role } from './llm/types';

export { FileSystemPromptLoader } from './prompt/loader';
export type { IPromptLoader, PromptTemplate, RenderedPrompt } from './prompt/types';

export { ZodOutputParser } from './guardrails/output-parser';

export { BaseChain } from './chains/base.chain';
export type { IChain, ChainContext, RetryPolicy } from './chains/types';
export type { BaseChainOptions } from './chains/base.chain';

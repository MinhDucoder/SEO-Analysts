/**
 * @file Prompt-as-code primitives. Prompts are YAML files with
 * semver filenames; loader resolves ranges to concrete versions.
 */
import type { Message } from '../llm/types';

export interface PromptTemplate {
  id: string;
  version: string;
  system?: string;
  user: string;
  metadata?: Record<string, unknown>;
}

export interface RenderedPrompt {
  messages: Message[];
  hash: string;
}

export interface IPromptLoader {
  load(id: string, opts: { version: string }): Promise<PromptTemplate>;
  render(
    id: string,
    vars: Record<string, unknown>,
    opts: { version: string },
  ): Promise<RenderedPrompt>;
}

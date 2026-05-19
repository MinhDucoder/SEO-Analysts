import type { Message } from '../llm/types.js';

export interface PromptMetadata {
  owner: string;
  tags?: string[];
  /** Hint for callers — informational. The library does not enforce. */
  minModel?: string;
  deprecated?: boolean;
}

export interface PromptExample {
  input: Record<string, unknown>;
  output: string;
}

export interface PromptTemplate {
  id: string;
  /** Strict semver string (e.g. "1.0.0"). */
  version: string;
  description?: string;
  /** Variable names declared by the template. Render-time validation against this list. */
  variables: string[];
  /** Optional system prompt (Handlebars source). */
  system?: string;
  /** User prompt (Handlebars source). Required. */
  user: string;
  examples?: PromptExample[];
  metadata: PromptMetadata;
}

export interface RenderedPrompt {
  id: string;
  version: string;
  messages: Message[];
  /** sha256 hash of (id + version + JSON.stringify(messages)), first 16 hex chars. */
  hash: string;
}

export interface PromptListEntry {
  id: string;
  version: string;
  metadata: PromptMetadata;
}

export interface IPromptLoader {
  load(id: string, version?: string): Promise<PromptTemplate>;
  render(
    id: string,
    vars: Record<string, unknown>,
    opts?: { version?: string },
  ): Promise<RenderedPrompt>;
  list(): Promise<PromptListEntry[]>;
}

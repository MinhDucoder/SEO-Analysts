import { z } from 'zod';

export const SuggestionItemSchema = z.object({
  ruleId: z.string().min(1),
  explanation: z.string().min(10).max(300),
  actionable_fix: z.string().min(10).max(400),
});

export const SuggestionsSchema = z.object({
  suggestions: z.array(SuggestionItemSchema).min(0).max(20),
});

export type Suggestion = z.infer<typeof SuggestionItemSchema>;
export type SuggestionsPayload = z.infer<typeof SuggestionsSchema>;

/** Shape persisted into Report.aiSuggestions (JSONB). */
export interface PersistedAiSuggestions {
  items: Suggestion[];
  generatedAt: string;
  model: string;
  promptHash: string;
  error?: 'parse_failed' | 'llm_failed' | 'disabled';
}

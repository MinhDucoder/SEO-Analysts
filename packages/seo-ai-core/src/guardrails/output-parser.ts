import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import { GuardrailError } from '../errors/index.js';

export function parseStructured<S extends ZodTypeAny>(raw: string, schema: S): ZodInfer<S> {
  if (!raw || raw.trim().length === 0) {
    throw new GuardrailError('parseStructured: empty input', { raw });
  }

  const candidates = [stripFence(raw), repairJson(stripFence(raw))];

  let lastError: unknown;
  for (const c of candidates) {
    let json: unknown;
    try {
      json = JSON.parse(c);
    } catch (err) {
      lastError = err;
      continue;
    }
    const parsed = schema.safeParse(json);
    if (parsed.success) return parsed.data as ZodInfer<S>;
    lastError = parsed.error;
  }

  throw new GuardrailError(
    `parseStructured: could not produce schema-valid output. Last error: ${(lastError as Error)?.message ?? String(lastError)}`,
    { raw, cause: lastError instanceof Error ? lastError : undefined },
  );
}

function stripFence(input: string): string {
  const trimmed = input.trim();
  // ```json ... ```  or  ``` ... ```
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trim();
}

/**
 * Single-pass repair for the most common LLM JSON mistakes:
 *   - trailing comma before } or ]
 *   - smart quotes (" " ' ') replaced with ASCII quotes
 * Keep it boring — aggressive repair masks real bugs.
 */
function repairJson(input: string): string {
  return input
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,(\s*[}\]])/g, '$1');
}

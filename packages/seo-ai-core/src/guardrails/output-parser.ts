/**
 * @file Structured-output parser. Strips ```json fences, attempts
 * JSON.parse, falls back to a conservative repair (trailing comma
 * removal, smart-quote normalization), then validates via Zod. Any
 * failure throws GuardrailError with the raw payload preserved so
 * callers can log + investigate prompt quality.
 */
import type { ZodType } from 'zod';
import { GuardrailError } from '../errors';

const FENCE_RE = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;

export class ZodOutputParser<T> {
  constructor(private readonly schema: ZodType<T>) {}

  parse(raw: string): T {
    const stripped = this.stripFence(raw);
    let obj: unknown;
    try {
      obj = JSON.parse(stripped);
    } catch {
      try {
        obj = JSON.parse(this.repair(stripped));
      } catch (err) {
        throw new GuardrailError('output is not valid JSON', { cause: err, raw });
      }
    }
    const result = this.schema.safeParse(obj);
    if (!result.success) {
      throw new GuardrailError(
        `output failed schema validation: ${result.error.message}`,
        { raw },
      );
    }
    return result.data;
  }

  private stripFence(raw: string): string {
    const trimmed = raw.trim();
    const m = FENCE_RE.exec(trimmed);
    return m && m[1] ? m[1].trim() : trimmed;
  }

  private repair(raw: string): string {
    return raw
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,(\s*[}\]])/g, '$1');
  }
}

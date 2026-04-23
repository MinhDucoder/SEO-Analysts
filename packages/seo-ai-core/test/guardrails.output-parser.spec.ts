import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ZodOutputParser } from '../src/guardrails/output-parser';
import { GuardrailError } from '../src/errors';

const Schema = z.object({ ok: z.boolean(), n: z.number().int() });

describe('ZodOutputParser', () => {
  it('parses clean JSON', () => {
    const p = new ZodOutputParser(Schema);
    expect(p.parse('{"ok":true,"n":42}')).toEqual({ ok: true, n: 42 });
  });

  it('strips ```json fences', () => {
    const p = new ZodOutputParser(Schema);
    const raw = '```json\n{"ok":false,"n":1}\n```';
    expect(p.parse(raw)).toEqual({ ok: false, n: 1 });
  });

  it('strips ``` fences without lang', () => {
    const p = new ZodOutputParser(Schema);
    expect(p.parse('```\n{"ok":true,"n":1}\n```')).toEqual({ ok: true, n: 1 });
  });

  it('throws GuardrailError on invalid JSON', () => {
    const p = new ZodOutputParser(Schema);
    expect(() => p.parse('{not json')).toThrow(GuardrailError);
  });

  it('throws GuardrailError on schema violation', () => {
    const p = new ZodOutputParser(Schema);
    expect(() => p.parse('{"ok":"yes","n":"x"}')).toThrow(GuardrailError);
  });

  it('preserves raw payload on failure for debugging', () => {
    const p = new ZodOutputParser(Schema);
    try {
      p.parse('{"ok":"no"}');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(GuardrailError);
      expect((e as GuardrailError).raw).toBe('{"ok":"no"}');
    }
  });

  it('repairs trailing commas as fallback', () => {
    const p = new ZodOutputParser(Schema);
    expect(p.parse('{"ok":true, "n":2,}')).toEqual({ ok: true, n: 2 });
  });
});

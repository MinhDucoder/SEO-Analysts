import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseStructured } from '../src/guardrails/output-parser.js';
import { GuardrailError } from '../src/errors/index.js';

const Schema = z.object({
  summary: z.string(),
  count: z.number().int().nonnegative(),
});

describe('parseStructured', () => {
  it('parses clean JSON matching the schema', () => {
    const r = parseStructured('{"summary":"ok","count":3}', Schema);
    expect(r).toEqual({ summary: 'ok', count: 3 });
  });

  it('strips ```json ... ``` fence', () => {
    const raw = '```json\n{"summary":"ok","count":1}\n```';
    expect(parseStructured(raw, Schema)).toEqual({ summary: 'ok', count: 1 });
  });

  it('strips bare ``` fence', () => {
    const raw = '```\n{"summary":"x","count":0}\n```';
    expect(parseStructured(raw, Schema)).toEqual({ summary: 'x', count: 0 });
  });

  it('repairs trailing comma in object', () => {
    expect(parseStructured('{"summary":"x","count":0,}', Schema)).toEqual({ summary: 'x', count: 0 });
  });

  it('repairs trailing comma in array (when nested in matching schema)', () => {
    const ArraySchema = z.object({ items: z.array(z.number()) });
    expect(parseStructured('{"items":[1,2,3,]}', ArraySchema)).toEqual({ items: [1, 2, 3] });
  });

  it('throws GuardrailError when JSON is unrecoverable', () => {
    expect(() => parseStructured('not json at all', Schema)).toThrow(GuardrailError);
    try {
      parseStructured('not json at all', Schema);
    } catch (err) {
      expect(err).toBeInstanceOf(GuardrailError);
      expect((err as GuardrailError).raw).toBe('not json at all');
    }
  });

  it('throws GuardrailError when JSON parses but fails Zod validation', () => {
    expect(() => parseStructured('{"summary":"x","count":-1}', Schema)).toThrow(GuardrailError);
  });

  it('throws GuardrailError on empty / whitespace-only input', () => {
    expect(() => parseStructured('   ', Schema)).toThrow(GuardrailError);
  });
});

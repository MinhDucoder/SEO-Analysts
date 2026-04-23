import { describe, it, expect } from 'vitest';
import { validateArgs, type ParsedArgs } from '../src/args';

function makeArgs(partial: Partial<ParsedArgs> = {}): ParsedArgs {
  return {
    url: undefined,
    file: undefined,
    mode: undefined,
    keyword: 'seo',
    secondary: [],
    enrich: 'llm',
    language: 'vi',
    format: 'pretty',
    failOn: undefined,
    minScore: undefined,
    apiKey: 'sk_test_K',
    apiBase: 'http://localhost:3000/api/v1',
    ...partial,
  };
}

describe('validateArgs', () => {
  it('passes when --url + --keyword provided', () => {
    const r = validateArgs(makeArgs({ url: 'https://x' }));
    expect(r.ok).toBe(true);
  });

  it('fails when neither --url nor --file provided', () => {
    const r = validateArgs(makeArgs());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--url or --file/i);
  });

  it('fails when both --url and --file provided', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', file: '/tmp/a.md' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/exactly one/i);
  });

  it('fails when --file without --mode', () => {
    const r = validateArgs(makeArgs({ file: '/tmp/a.md' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/--mode/i);
  });

  it('fails when --keyword is empty', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', keyword: '' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/keyword/i);
  });

  it('fails when --apikey missing', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', apiKey: '' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/api key/i);
  });

  it('fails when --min-score out of range', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', minScore: 150 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/min-score/i);
  });

  it('fails when --fail-on invalid', () => {
    const r = validateArgs(makeArgs({ url: 'https://x', failOn: 'garbage' as never }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/fail-on/i);
  });
});

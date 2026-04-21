import { describe, it, expect } from 'vitest';
import {
  AiCoreError,
  LLMError,
  PromptError,
  ChainError,
  GuardrailError,
  RetrieverError,
} from '../src/errors';

describe('error taxonomy', () => {
  it('AiCoreError is the base class', () => {
    const e = new AiCoreError('base');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('AiCoreError');
    expect(e.message).toBe('base');
  });

  it.each([
    ['LLMError', LLMError],
    ['PromptError', PromptError],
    ['ChainError', ChainError],
    ['GuardrailError', GuardrailError],
    ['RetrieverError', RetrieverError],
  ])('%s extends AiCoreError and sets name', (name, Ctor) => {
    const e = new Ctor('x');
    expect(e).toBeInstanceOf(AiCoreError);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe(name);
    expect(e.message).toBe('x');
  });

  it('GuardrailError carries optional raw payload + cause', () => {
    const cause = new Error('original');
    const e = new GuardrailError('parse failed', { raw: '{invalid', cause });
    expect(e.raw).toBe('{invalid');
    expect(e.cause).toBe(cause);
  });
});

import { describe, it, expect } from 'vitest';
import {
  AiCoreError,
  LLMError,
  PromptError,
  GuardrailError,
  ChainError,
  isTransientLLMError,
} from '../src/errors';

describe('error taxonomy', () => {
  it('all errors extend AiCoreError with preserved cause + context', () => {
    const e = new LLMError('boom', { cause: new Error('net'), retriable: true });
    expect(e).toBeInstanceOf(AiCoreError);
    expect(e).toBeInstanceOf(LLMError);
    expect(e.message).toBe('boom');
    expect((e.cause as Error).message).toBe('net');
    expect(e.retriable).toBe(true);
  });

  it('GuardrailError captures the raw payload for debugging', () => {
    const e = new GuardrailError('bad json', { raw: '{"nope": ' });
    expect(e.raw).toBe('{"nope": ');
    expect(e.retriable).toBe(false);
  });

  it('PromptError is non-retriable', () => {
    const e = new PromptError('unknown var {{x}}');
    expect(e.retriable).toBe(false);
  });

  it('ChainError wraps downstream errors and forwards cause', () => {
    const inner = new LLMError('x');
    const e = new ChainError('chain failed', { cause: inner });
    expect(e.cause).toBe(inner);
  });

  it('isTransientLLMError returns true only for retriable LLMError', () => {
    expect(isTransientLLMError(new LLMError('x', { retriable: true }))).toBe(true);
    expect(isTransientLLMError(new LLMError('x', { retriable: false }))).toBe(false);
    expect(isTransientLLMError(new GuardrailError('x'))).toBe(false);
    expect(isTransientLLMError(new Error('x'))).toBe(false);
  });
});

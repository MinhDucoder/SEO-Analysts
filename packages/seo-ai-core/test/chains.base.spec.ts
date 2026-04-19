import { describe, it, expect, vi } from 'vitest';
import { createBaseChain } from '../src/chains/base.chain.js';
import { LLMError, ChainError, GuardrailError } from '../src/errors/index.js';
import type { Logger } from '../src/observability/logger.js';

const captureLogger = (): Logger & { logs: Array<{ level: string; msg: string; ctx?: object }> } => {
  const logs: Array<{ level: string; msg: string; ctx?: object }> = [];
  return {
    logs,
    debug: (msg, ctx) => logs.push({ level: 'debug', msg, ctx }),
    info: (msg, ctx) => logs.push({ level: 'info', msg, ctx }),
    warn: (msg, ctx) => logs.push({ level: 'warn', msg, ctx }),
    error: (msg, ctx) => logs.push({ level: 'error', msg, ctx }),
  };
};

describe('createBaseChain', () => {
  it('invokes the inner function and returns its result', async () => {
    const inner = vi.fn(async (input: { x: number }) => ({ y: input.x * 2 }));
    const chain = createBaseChain({
      name: 'test',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: inner,
    });
    const out = await chain.invoke({ x: 21 });
    expect(out).toEqual({ y: 42 });
    expect(inner).toHaveBeenCalledOnce();
  });

  it('emits start/success log lines with traceId in context', async () => {
    const log = captureLogger();
    const chain = createBaseChain({
      name: 'logged',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => 'ok',
    });
    await chain.invoke({}, { logger: log, traceId: 'trace-123' });
    expect(log.logs.some((l) => l.msg.includes('chain.start') && (l.ctx as { traceId?: string }).traceId === 'trace-123')).toBe(true);
    expect(log.logs.some((l) => l.msg.includes('chain.success'))).toBe(true);
  });

  it('retries ONCE on transient LLMError, then succeeds', async () => {
    let calls = 0;
    const chain = createBaseChain({
      name: 'retry',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => {
        calls += 1;
        if (calls === 1) throw new LLMError('rate limited');
        return 'ok';
      },
    });
    const out = await chain.invoke({});
    expect(out).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does NOT retry on GuardrailError (deterministic — retry will not help)', async () => {
    let calls = 0;
    const chain = createBaseChain({
      name: 'no-retry',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => {
        calls += 1;
        throw new GuardrailError('schema mismatch');
      },
    });
    await expect(chain.invoke({})).rejects.toThrow(GuardrailError);
    expect(calls).toBe(1);
  });

  it('wraps unknown errors in ChainError on final failure', async () => {
    const chain = createBaseChain({
      name: 'unknown',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => {
        throw new Error('something else');
      },
    });
    await expect(chain.invoke({})).rejects.toThrow(ChainError);
  });

  it('exposes name + promptId + promptVersion', () => {
    const chain = createBaseChain({
      name: 'meta',
      promptId: 'p1',
      promptVersion: '2.0.0',
      run: async () => null,
    });
    expect(chain.name).toBe('meta');
    expect(chain.promptId).toBe('p1');
    expect(chain.promptVersion).toBe('2.0.0');
  });

  it('fires onStart / onSuccess callbacks', async () => {
    const onStart = vi.fn();
    const onSuccess = vi.fn();
    const chain = createBaseChain({
      name: 'cb',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => 42,
    });
    await chain.invoke({ q: 'x' }, { callbacks: { onStart, onSuccess } });
    expect(onStart).toHaveBeenCalledWith({ q: 'x' });
    expect(onSuccess).toHaveBeenCalledWith(42);
  });

  it('fires onError callback on failure', async () => {
    const onError = vi.fn();
    const chain = createBaseChain({
      name: 'cb-err',
      promptId: 'p',
      promptVersion: '1.0.0',
      run: async () => {
        throw new GuardrailError('x');
      },
    });
    await expect(
      chain.invoke({}, { callbacks: { onError } }),
    ).rejects.toThrow(GuardrailError);
    expect(onError).toHaveBeenCalled();
  });
});

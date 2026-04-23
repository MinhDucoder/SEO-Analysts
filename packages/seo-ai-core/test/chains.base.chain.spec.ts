import { describe, it, expect, vi } from 'vitest';
import { BaseChain } from '../src/chains/base.chain';
import { LLMError, GuardrailError, ChainError } from '../src/errors';

describe('BaseChain', () => {
  it('run() returns underlying result', async () => {
    const chain = new BaseChain<{ x: number }, number>({
      name: 'double',
      run: async (i) => i.x * 2,
    });
    expect(await chain.run({ x: 3 })).toBe(6);
  });

  it('retries on retriable LLMError up to maxAttempts', async () => {
    const fn = vi
      .fn<[unknown], Promise<number>>()
      .mockRejectedValueOnce(new LLMError('net', { retriable: true }))
      .mockResolvedValue(7);
    const chain = new BaseChain<unknown, number>({
      name: 't',
      run: fn,
      retry: { maxAttempts: 2, backoffMs: 1 },
    });
    expect(await chain.run({})).toBe(7);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry GuardrailError', async () => {
    const fn = vi.fn<[unknown], Promise<number>>().mockRejectedValue(new GuardrailError('bad'));
    const chain = new BaseChain<unknown, number>({
      name: 't',
      run: fn,
      retry: { maxAttempts: 3, backoffMs: 1 },
    });
    await expect(chain.run({})).rejects.toThrow(ChainError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wraps final failure in ChainError preserving cause', async () => {
    const inner = new LLMError('boom', { retriable: true });
    const fn = vi.fn<[unknown], Promise<number>>().mockRejectedValue(inner);
    const chain = new BaseChain<unknown, number>({
      name: 't',
      run: fn,
      retry: { maxAttempts: 1, backoffMs: 1 },
    });
    let caught: unknown;
    try {
      await chain.run({});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ChainError);
    expect((caught as ChainError).cause).toBe(inner);
  });

  it('enforces timeout via AbortController', async () => {
    const fn = vi.fn<[unknown, { signal?: AbortSignal }], Promise<number>>(
      async (_i, ctx) =>
        new Promise((_res, rej) => {
          ctx?.signal?.addEventListener('abort', () =>
            rej(new LLMError('aborted', { retriable: false })),
          );
        }),
    );
    const chain = new BaseChain<unknown, number>({
      name: 't',
      run: (input, internal) => fn(input, internal),
      retry: { maxAttempts: 1 },
    });
    await expect(chain.run({}, { timeoutMs: 10 })).rejects.toThrow(ChainError);
  });

  it('forwards traceId into logger.child when logger provided', async () => {
    const childLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnValue(childLogger),
    };
    const chain = new BaseChain<unknown, number>({
      name: 't',
      run: async () => 1,
      logger,
    });
    await chain.run({}, { traceId: 'abc' });
    expect(logger.child).toHaveBeenCalledWith(expect.objectContaining({ traceId: 'abc' }));
    expect(childLogger.info).toHaveBeenCalled();
  });
});

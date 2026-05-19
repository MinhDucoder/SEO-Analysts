import { describe, it, expect, vi } from 'vitest';
import { noopLogger, createPinoLogger, type Logger } from '../src/observability/logger';

describe('Logger', () => {
  it('noopLogger accepts all 4 levels without throwing', () => {
    const log: Logger = noopLogger;
    expect(() => log.debug('a')).not.toThrow();
    expect(() => log.info('b')).not.toThrow();
    expect(() => log.warn('c')).not.toThrow();
    expect(() => log.error('d')).not.toThrow();
  });

  it('createPinoLogger returns a Logger that delegates to the underlying pino instance', () => {
    const fakePino = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const log = createPinoLogger(fakePino);
    log.debug('d', { k: 1 });
    log.info('i');
    log.warn('w', { ctx: 'x' });
    log.error('e');
    expect(fakePino.debug).toHaveBeenCalledWith({ k: 1 }, 'd');
    expect(fakePino.info).toHaveBeenCalledWith({}, 'i');
    expect(fakePino.warn).toHaveBeenCalledWith({ ctx: 'x' }, 'w');
    expect(fakePino.error).toHaveBeenCalledWith({}, 'e');
  });
});

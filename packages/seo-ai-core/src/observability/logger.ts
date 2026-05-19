export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext): void;
}

export const noopLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/**
 * Minimal subset of pino's Logger interface that we depend on. Avoids importing
 * pino's types directly so consumers without pino installed still type-check.
 */
export interface PinoLike {
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export function createPinoLogger(pino: PinoLike): Logger {
  return {
    debug: (msg, ctx) => pino.debug(ctx ?? {}, msg),
    info: (msg, ctx) => pino.info(ctx ?? {}, msg),
    warn: (msg, ctx) => pino.warn(ctx ?? {}, msg),
    error: (msg, ctx) => pino.error(ctx ?? {}, msg),
  };
}

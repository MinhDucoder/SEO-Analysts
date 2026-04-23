/**
 * @file Minimal structured-logger interface consumers pass into chains.
 * Default `noopLogger` lets consumers opt out. Consumers can adapt
 * pino/winston/console behind this interface without pulling the
 * library into our deps.
 */

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(fields: LogFields, msg?: string): void;
  info(fields: LogFields, msg?: string): void;
  warn(fields: LogFields, msg?: string): void;
  error(fields: LogFields, msg?: string): void;
  child?(fields: LogFields): Logger;
}

export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export function consoleLogger(): Logger {
  return {
    debug: (f, m) => console.debug(m ?? '', f),
    info: (f, m) => console.info(m ?? '', f),
    warn: (f, m) => console.warn(m ?? '', f),
    error: (f, m) => console.error(m ?? '', f),
  };
}

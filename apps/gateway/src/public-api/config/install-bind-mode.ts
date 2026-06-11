import { ConfigService } from '@nestjs/config';

export type ApiKeyInstallBindMode = 'off' | 'log' | 'enforce';

export const INSTALL_BIND_MODE = Symbol('INSTALL_BIND_MODE');

export function readInstallBindMode(config: ConfigService): ApiKeyInstallBindMode {
  const raw = (config.get<string>('API_KEY_INSTALL_BIND_MODE') ?? 'log').toLowerCase();
  if (raw === 'off' || raw === 'log' || raw === 'enforce') return raw;
  return 'log'; // default conservative: log without blocking
}

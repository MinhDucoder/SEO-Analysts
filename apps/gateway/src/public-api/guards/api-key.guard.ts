/**
 * @file Guard for public-API routes authenticated by Bearer `sk_...` keys.
 * Distinct from the app-wide `JwtAuthGuard` — public routes should bypass
 * JWT (marked with `@Public()`) and use this guard instead.
 *
 * Honours `API_KEY_INSTALL_BIND_MODE`:
 *   - off     → no install check, no header read
 *   - log     → bind on first use if header present + valid; mismatches/missing
 *               are LOGGED and the request is allowed through (rollout phase)
 *   - enforce → mismatches/missing → 401
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService, ApiKeyVerifyResult } from '../services/api-key.service';
import { ApiKeyEnvironment } from '@repo/shared';
import {
  ApiKeyInstallBindMode,
  INSTALL_BIND_MODE,
} from '../config/install-bind-mode';

export interface RequestWithApiKey extends Request {
  apiKey?: { id: string; userId: string; environment: ApiKeyEnvironment };
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly svc: ApiKeyService,
    @Inject(INSTALL_BIND_MODE) private readonly mode: ApiKeyInstallBindMode,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithApiKey>();
    const auth = req.headers?.authorization;
    if (!auth) {
      throw new UnauthorizedException({
        code: 'MISSING_API_KEY',
        message: 'Authorization header required',
      });
    }

    const installHeader =
      typeof req.headers?.['x-install-id'] === 'string'
        ? (req.headers['x-install-id'] as string)
        : undefined;

    if (this.mode === 'off') {
      const r = await this.svc.verify(auth, undefined, { skipInstallCheck: true });
      return this.applyResult(r, req);
    }

    let r = await this.svc.verify(auth, installHeader);

    if (this.mode === 'log' && !r.valid && (r.reason === 'missing_install_id' || r.reason === 'install_mismatch')) {
      this.logger.warn(
        { reason: r.reason, hasHeader: installHeader !== undefined, ip: req.ip },
        'API_KEY_INSTALL_BIND_MODE=log: would have rejected, allowing through',
      );
      r = await this.svc.verify(auth, undefined, { skipInstallCheck: true });
    }

    return this.applyResult(r, req);
  }

  private applyResult(r: ApiKeyVerifyResult, req: RequestWithApiKey): boolean {
    if (!r.valid) {
      switch (r.reason) {
        case 'user_disabled':
          throw new ForbiddenException({ code: 'KEY_DISABLED', message: 'Associated user is disabled' });
        case 'missing_install_id':
          throw new UnauthorizedException({
            code: 'MISSING_INSTALL_ID',
            message: 'X-Install-Id header required (UUID v4)',
          });
        case 'install_mismatch':
          throw new UnauthorizedException({
            code: 'KEY_INSTALL_MISMATCH',
            message:
              'Key đang được bound thiết bị khác. Rebind tại web app hoặc dùng thiết bị gốc.',
          });
        default:
          throw new UnauthorizedException({ code: 'INVALID_API_KEY', message: 'Invalid or revoked API key' });
      }
    }
    req.apiKey = { id: r.apiKeyId, userId: r.userId, environment: r.environment };
    this.svc.recordUsage(r.apiKeyId, req.ip);
    return true;
  }
}

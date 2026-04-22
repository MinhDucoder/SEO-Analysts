/**
 * @file Guard for public-API routes authenticated by Bearer `sk_...` keys.
 * Distinct from the app-wide `JwtAuthGuard` — public routes should bypass
 * JWT (marked with `@Public()`) and use this guard instead.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import { ApiKeyEnvironment } from '@repo/shared';

export interface RequestWithApiKey extends Request {
  apiKey?: { id: string; userId: string; environment: ApiKeyEnvironment };
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly svc: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithApiKey>();
    const auth = req.headers?.authorization;
    if (!auth) {
      throw new UnauthorizedException({
        code: 'MISSING_API_KEY',
        message: 'Authorization header required',
      });
    }

    const r = await this.svc.verify(auth);
    if (!r.valid) {
      if (r.reason === 'user_disabled') {
        throw new ForbiddenException({
          code: 'KEY_DISABLED',
          message: 'Associated user is disabled',
        });
      }
      throw new UnauthorizedException({
        code: 'INVALID_API_KEY',
        message: 'Invalid or revoked API key',
      });
    }

    req.apiKey = { id: r.apiKeyId, userId: r.userId, environment: r.environment };
    this.svc.recordUsage(r.apiKeyId, req.ip);
    return true;
  }
}

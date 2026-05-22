import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { OPTIONAL_AUTH_KEY } from '../../common/decorators/optional-auth.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    if (this.isOptional(context)) {
      const req = context.switchToHttp().getRequest();
      const hasAuth = !!(req?.headers?.authorization || req?.headers?.Authorization);
      // No credentials → allow through as anonymous (req.user stays undefined).
      if (!hasAuth) return true;
      // Credentials present → fall through to passport to verify the token.
    }

    return super.canActivate(context);
  }

  /**
   * Under @OptionalAuth, a missing/invalid token must not reject the request —
   * it just leaves `req.user` undefined. Otherwise behave like the default guard.
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    _info: any,
    context: ExecutionContext,
  ): TUser {
    if (this.isOptional(context) && (err || !user)) {
      return undefined as unknown as TUser;
    }
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }

  private isOptional(context: ExecutionContext): boolean {
    return !!this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}

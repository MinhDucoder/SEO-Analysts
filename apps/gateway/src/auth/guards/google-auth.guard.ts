import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

const REQUIRED_ENV = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'] as const;

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const missing = REQUIRED_ENV.filter((key) => !this.config.get<string>(key));
    if (missing.length > 0) {
      throw new ServiceUnavailableException(
        `Google OAuth chua duoc cau hinh — thieu env: ${missing.join(', ')}`,
      );
    }
    return super.canActivate(context);
  }
}

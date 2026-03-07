import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
      passReqToCallback: false as const,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { emails: Array<{ value: string }>; id: string },
    done: VerifyCallback,
  ): void {
    const user = {
      email: profile.emails[0].value,
      providerId: profile.id,
      provider: 'google',
    };
    done(null, user);
  }
}

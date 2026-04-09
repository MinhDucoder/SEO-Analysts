import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfilePayload {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  oauthProvider: 'google';
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(_at: string, _rt: string, profile: any, done: VerifyCallback): Promise<void> {
    const payload: GoogleProfilePayload = {
      email: profile.emails?.[0]?.value ?? '',
      fullName: profile.displayName ?? 'Unknown',
      avatarUrl: profile.photos?.[0]?.value ?? null,
      oauthProvider: 'google',
    };
    done(null, payload);
  }
}

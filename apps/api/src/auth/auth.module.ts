import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

const googleStrategyProvider = {
  provide: GoogleStrategy,
  useFactory: (configService: ConfigService) => {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientID) {
      return null;
    }
    return new GoogleStrategy(configService);
  },
  inject: [ConfigService],
};

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, googleStrategyProvider],
  exports: [AuthService],
})
export class AuthModule {}

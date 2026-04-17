import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService, IssuedTokens } from './token.service';
import { VerificationService } from './verification.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RateLimiterService } from '../../infra/redis/rate-limiter.service';
import { RATE_LIMIT, UserRole } from '@repo/shared';
import { GoogleProfilePayload } from '../strategies/google.strategy';

export interface RequestContext {
  ip: string;
  userAgent: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly verification: VerificationService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async register(dto: RegisterDto, ctx: RequestContext) {
    const rl = await this.rateLimiter.consume(
      this.rateLimiter.registerBucket(ctx.ip),
      RATE_LIMIT.REGISTER_PER_HOUR,
      3600,
    );
    if (!rl.allowed) {
      throw new ForbiddenException(`Da dat gioi han dang ky. Thu lai sau ${rl.retryAfterSeconds}s`);
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email da ton tai');

    const passwordHash = await this.password.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: UserRole.USER,
        isVerified: false,
      },
    });

    const verifyToken = await this.verification.createVerificationToken(user.id);
    this.logger.log(`User ${user.email} registered. Verify token (TODO send email): ${verifyToken}`);

    return {
      user: this.toPublic(user),
      message: 'Dang ky thanh cong. Vui long kiem tra email de xac minh tai khoan.',
      verifyToken, // TODO: remove once email service is wired
    };
  }

  async login(dto: LoginDto, ctx: RequestContext): Promise<{ user: ReturnType<AuthService['toPublic']>; tokens: IssuedTokens }> {
    const rl = await this.rateLimiter.consume(
      this.rateLimiter.loginBucket(dto.email),
      RATE_LIMIT.LOGIN_ATTEMPTS_PER_15MIN,
      900,
    );
    if (!rl.allowed) {
      throw new ForbiddenException(`Qua nhieu lan dang nhap that bai. Thu lai sau ${rl.retryAfterSeconds}s`);
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoac mat khau khong dung');
    }
    const ok = await this.password.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Email hoac mat khau khong dung');
    if (user.isLocked) throw new ForbiddenException('Tai khoan da bi khoa');
    if (!user.isVerified) throw new ForbiddenException('Vui long xac minh email truoc khi dang nhap');

    const tokens = await this.tokens.issueTokens(
      { id: user.id, email: user.email, role: user.role as UserRole },
      { userAgent: ctx.userAgent, ipAddress: ctx.ip },
    );
    return { user: this.toPublic(user), tokens };
  }

  async refresh(rawRefresh: string, ctx: RequestContext): Promise<IssuedTokens> {
    return this.tokens.rotateRefreshToken(rawRefresh, { userAgent: ctx.userAgent, ipAddress: ctx.ip });
  }

  async logout(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    await this.tokens.revokeRefreshToken(rawRefresh);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.verification.consumeVerificationToken(token);
    if (!userId) throw new UnauthorizedException('Token khong hop le hoac het han');
    await this.prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return; // do not leak existence
    const token = await this.verification.createResetToken(user.id);
    this.logger.log(`Password reset token for ${email}: ${token}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.verification.consumeResetToken(token);
    if (!userId) throw new UnauthorizedException('Token khong hop le hoac het han');
    const passwordHash = await this.password.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async loginWithGoogle(profile: GoogleProfilePayload, ctx: RequestContext): Promise<{ user: ReturnType<AuthService['toPublic']>; tokens: IssuedTokens }> {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          fullName: profile.fullName,
          oauthProvider: profile.oauthProvider,
          avatarUrl: profile.avatarUrl,
          isVerified: true,
          role: UserRole.USER,
        },
      });
    }
    if (user.isLocked) throw new ForbiddenException('Tai khoan da bi khoa');

    const tokens = await this.tokens.issueTokens(
      { id: user.id, email: user.email, role: user.role as UserRole },
      { userAgent: ctx.userAgent, ipAddress: ctx.ip },
    );
    return { user: this.toPublic(user), tokens };
  }

  toPublic(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isVerified: boolean;
    avatarUrl: string | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}

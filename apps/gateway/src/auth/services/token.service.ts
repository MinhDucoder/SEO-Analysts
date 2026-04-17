/**
 * @file JWT access + opaque-refresh token issuance & rotation.
 * Refresh tokens are stored hashed (SHA-256) in the DB so a leaked
 * DB dump never exposes usable tokens; rotation invalidates the old row.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { JWT_CONFIG, UserRole } from '@repo/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES,
      },
    );
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issueTokens(
    user: { id: string; email: string; role: UserRole },
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<IssuedTokens> {
    const accessToken = this.signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = this.generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + JWT_CONFIG.REFRESH_TOKEN_EXPIRES_DAYS * 86400 * 1000);

    const row = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshTokenId: row.id, refreshExpiresAt };
  }

  async rotateRefreshToken(
    rawRefreshToken: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<IssuedTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, isRevoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!existing) throw new UnauthorizedException('Refresh token khong hop le');

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { isRevoked: true },
    });

    return this.issueTokens(
      { id: existing.user.id, email: existing.user.email, role: existing.user.role as UserRole },
      meta,
    );
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true },
    });
  }
}

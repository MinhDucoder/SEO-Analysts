import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/auth/services/auth.service';
import { PasswordService } from '../../src/auth/services/password.service';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@repo/shared';

describe('AuthService', () => {
  let svc: AuthService;
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: { updateMany: vi.fn() },
  };
  const password = new PasswordService();
  const tokens = {
    issueTokens: vi.fn().mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      refreshTokenId: 'id',
      refreshExpiresAt: new Date(),
    }),
    rotateRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
  };
  const verification = {
    createVerificationToken: vi.fn().mockResolvedValue('vt'),
    consumeVerificationToken: vi.fn(),
    createResetToken: vi.fn().mockResolvedValue('rt'),
    consumeResetToken: vi.fn(),
  };
  const rateLimiter = {
    consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 }),
    loginBucket: (e: string) => `login:${e}`,
    registerBucket: (ip: string) => `reg:${ip}`,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AuthService(prisma as never, password, tokens as never, verification as never, rateLimiter as never);
  });

  it('register rejects duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'x' });
    await expect(
      svc.register(
        { email: 'a@b.c', fullName: 'X', password: 'Passw0rd!' },
        { ip: '1.1.1.1', userAgent: 'jest' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('register hashes password and creates user', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 'u1',
      ...data,
      role: 'user',
      avatarUrl: null,
      createdAt: new Date(),
    }));
    const out = await svc.register(
      { email: 'a@b.c', fullName: 'A B', password: 'Passw0rd!' },
      { ip: '1.1.1.1', userAgent: 'jest' },
    );
    expect(out.user.email).toBe('a@b.c');
    expect(out.verifyToken).toBe('vt');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('login rejects unknown email with generic 401', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.login({ email: 'x@y.z', password: 'Passw0rd!' }, { ip: '1.1.1.1', userAgent: 'jest' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login rejects locked accounts', async () => {
    const hash = await password.hash('Passw0rd!');
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.c', passwordHash: hash, role: 'user', isLocked: true, isVerified: true,
      fullName: 'X', avatarUrl: null, createdAt: new Date(),
    });
    await expect(
      svc.login({ email: 'a@b.c', password: 'Passw0rd!' }, { ip: '1.1.1.1', userAgent: 'jest' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('verifyEmail flips isVerified flag', async () => {
    verification.consumeVerificationToken.mockResolvedValueOnce('u1');
    await svc.verifyEmail('vt');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { isVerified: true },
    });
  });
});

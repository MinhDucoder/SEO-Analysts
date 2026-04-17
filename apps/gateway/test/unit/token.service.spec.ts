import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../src/auth/services/token.service';
import { UserRole } from '@repo/shared';

describe('TokenService', () => {
  let svc: TokenService;
  const prismaMock = {
    refreshToken: {
      create: vi.fn().mockResolvedValue({ id: 'rt-1' }),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const config = {
    getOrThrow: vi.fn().mockReturnValue('test-secret-1234567890'),
  } as unknown as ConfigService;
  const jwt = new JwtService({});

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new TokenService(jwt, config, prismaMock as never);
  });

  it('signAccessToken returns a JWT', () => {
    const tok = svc.signAccessToken({ sub: 'u1', email: 'a@b.c', role: UserRole.USER });
    expect(tok.split('.').length).toBe(3);
  });

  it('issueTokens creates a refresh token row', async () => {
    const out = await svc.issueTokens(
      { id: 'u1', email: 'a@b.c', role: UserRole.USER },
      { userAgent: 'jest', ipAddress: '127.0.0.1' },
    );
    expect(out.accessToken).toBeTypeOf('string');
    expect(out.refreshToken.length).toBeGreaterThan(40);
    expect(prismaMock.refreshToken.create).toHaveBeenCalledOnce();
  });

  it('rotateRefreshToken throws when token not found', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValueOnce(null);
    await expect(
      svc.rotateRefreshToken('bad', { userAgent: 'x', ipAddress: 'y' }),
    ).rejects.toThrow(/khong hop le/);
  });

  it('rotateRefreshToken revokes old + issues new', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValueOnce({
      id: 'rt-old',
      user: { id: 'u1', email: 'a@b.c', role: 'user' },
    });
    const out = await svc.rotateRefreshToken('valid', { userAgent: 'x', ipAddress: 'y' });
    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-old' },
      data: { isRevoked: true },
    });
    expect(out.accessToken).toBeTypeOf('string');
  });
});

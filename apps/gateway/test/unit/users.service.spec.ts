import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../src/users/services/users.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { PasswordService } from '../../src/auth/services/password.service';

describe('UsersService', () => {
  let svc: UsersService;
  const prisma = {
    user: { update: vi.fn(), findUnique: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
  } as unknown as PrismaService;
  const password = { compare: vi.fn(), hash: vi.fn() } as unknown as PasswordService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new UsersService(prisma, password);
  });

  describe('updateProfile', () => {
    it('rejects an empty update (no fullName and no avatarUrl)', async () => {
      await expect(svc.updateProfile('u1', {})).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates only the fields provided', async () => {
      (prisma.user.update as any).mockResolvedValue({ id: 'u1', fullName: 'New Name', avatarUrl: null });
      const out = await svc.updateProfile('u1', { fullName: 'New Name' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { fullName: 'New Name' },
      });
      expect(out).toEqual({ id: 'u1', fullName: 'New Name', avatarUrl: null });
    });

    it('updates avatarUrl alone without touching fullName', async () => {
      (prisma.user.update as any).mockResolvedValue({ id: 'u1', fullName: 'Old', avatarUrl: 'http://x/a.png' });
      await svc.updateProfile('u1', { avatarUrl: 'http://x/a.png' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: 'http://x/a.png' },
      });
    });
  });

  describe('changePassword', () => {
    const dto = { currentPassword: 'old-pass', newPassword: 'new-pass-123' };

    it('throws NotFound when the user does not exist', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      await expect(svc.changePassword('u1', dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects password change for an OAuth account with no passwordHash', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', passwordHash: null });
      await expect(svc.changePassword('u1', dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the current password does not match', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', passwordHash: 'hash' });
      (password.compare as any).mockResolvedValue(false);
      await expect(svc.changePassword('u1', dto)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rehashes the password and revokes every active refresh token on success', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', passwordHash: 'old-hash' });
      (password.compare as any).mockResolvedValue(true);
      (password.hash as any).mockResolvedValue('new-hash');

      const out = await svc.changePassword('u1', dto);

      expect(password.hash).toHaveBeenCalledWith('new-pass-123');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: 'new-hash' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isRevoked: false },
        data: { isRevoked: true },
      });
      expect(out).toEqual({ message: 'Mat khau da duoc cap nhat' });
    });
  });
});

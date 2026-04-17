import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PasswordService } from '../../auth/services/password.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (!dto.fullName && !dto.avatarUrl) {
      throw new BadRequestException('Khong co thong tin de cap nhat');
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.avatarUrl ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });
    return { id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User khong ton tai');
    if (!user.passwordHash) {
      throw new BadRequestException('Tai khoan OAuth khong co mat khau');
    }
    const ok = await this.password.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Mat khau hien tai khong dung');
    const newHash = await this.password.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { message: 'Mat khau da duoc cap nhat' };
  }
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@repo/shared';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: true, description: 'true = khoa tai khoan, false = mo khoa' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ enum: UserRole, description: 'Vai tro moi cua user' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

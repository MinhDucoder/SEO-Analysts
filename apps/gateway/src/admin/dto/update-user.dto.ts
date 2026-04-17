import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: true, description: 'true = khoa tai khoan, false = mo khoa' })
  @IsBoolean()
  isLocked!: boolean;
}

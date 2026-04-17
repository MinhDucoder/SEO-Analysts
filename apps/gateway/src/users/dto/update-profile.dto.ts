import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Minh Duc Updated', description: 'Ho ten moi' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://i.pravatar.cc/150?u=duc', description: 'URL avatar moi' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  avatarUrl?: string;
}

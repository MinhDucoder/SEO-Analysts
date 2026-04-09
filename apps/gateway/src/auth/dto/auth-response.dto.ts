import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@repo/shared';

export class UserPublicDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty() isVerified!: boolean;
  @ApiProperty({ required: false, nullable: true }) avatarUrl!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserPublicDto }) user!: UserPublicDto;
  @ApiProperty() accessToken!: string;
}

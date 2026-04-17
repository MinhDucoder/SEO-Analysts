import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'wQh0si2p3WZuhh8AHZAqIjbxur2PGp9d6UJ9BIdQa9E', description: 'Token nhan duoc khi register' })
  @IsString()
  @Length(16, 256)
  token!: string;
}

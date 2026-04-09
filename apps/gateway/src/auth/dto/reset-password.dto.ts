import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @Length(16, 256)
  token!: string;

  @ApiProperty()
  @IsString()
  @Length(8, 72)
  @Matches(/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
  newPassword!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Test1234!', description: 'Mat khau hien tai' })
  @IsString()
  @Length(1)
  currentPassword!: string;

  @ApiProperty({ example: 'NewPass5678!', description: 'Mat khau moi (8+ chars, 1 hoa, 1 so, 1 dac biet)' })
  @IsString()
  @Length(8, 72)
  @Matches(/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
  newPassword!: string;
}

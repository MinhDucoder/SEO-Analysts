import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'newuser@example.com', description: 'Email da dang ky' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Test1234!', description: 'Mat khau' })
  @IsString()
  @MinLength(1)
  password!: string;
}

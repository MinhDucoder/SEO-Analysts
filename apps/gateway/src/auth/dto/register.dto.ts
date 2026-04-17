import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'newuser@example.com', description: 'Email dang ky (unique)' })
  @IsEmail({}, { message: 'Email khong hop le' })
  email!: string;

  @ApiProperty({ example: 'Nguyen Van Test', description: 'Ho ten (2-100 ky tu)' })
  @IsString()
  @Length(2, 100, { message: 'fullName phai tu 2-100 ky tu' })
  fullName!: string;

  @ApiProperty({ example: 'Test1234!', description: 'Min 8 chars, 1 uppercase, 1 digit, 1 special' })
  @IsString()
  @Length(8, 72, { message: 'Mat khau toi thieu 8 ky tu' })
  @Matches(/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: 'Mat khau phai co 1 chu hoa, 1 so, 1 ky tu dac biet',
  })
  password!: string;
}

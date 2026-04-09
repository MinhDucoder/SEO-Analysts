import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email khong hop le' })
  email!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @Length(2, 100, { message: 'fullName phai tu 2-100 ky tu' })
  fullName!: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  @Length(8, 72, { message: 'Mat khau toi thieu 8 ky tu' })
  @Matches(/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: 'Mat khau phai co 1 chu hoa, 1 so, 1 ky tu dac biet',
  })
  password!: string;
}

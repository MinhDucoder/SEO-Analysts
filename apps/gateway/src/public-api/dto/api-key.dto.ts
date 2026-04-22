import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production CI' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ['live', 'test'] })
  @IsIn(['live', 'test'])
  environment!: 'live' | 'test';
}

export class ApiKeyDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() prefix!: string;
  @ApiProperty({ enum: ['live', 'test'] }) environment!: 'live' | 'test';
  @ApiProperty({ nullable: true, type: String }) lastUsedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ nullable: true, type: String }) revokedAt!: Date | null;
}

export class CreateApiKeyResponseDto extends ApiKeyDto {
  @ApiProperty({
    description:
      'Plaintext shown ONCE. Copy it now — it will not be shown again.',
  })
  plaintext!: string;
}

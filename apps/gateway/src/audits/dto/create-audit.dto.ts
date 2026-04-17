import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateAuditDto {
  @ApiProperty({ example: 'https://google.com', description: 'URL can phan tich SEO' })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({ example: 'search engine', description: 'Tu khoa muc tieu de danh gia keyword density' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  targetKeyword?: string;
}

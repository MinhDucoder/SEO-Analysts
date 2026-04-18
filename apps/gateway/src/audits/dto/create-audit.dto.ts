import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export enum AuditModeDto {
  SINGLE = 'single',
  SITE = 'site',
}

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

  @ApiPropertyOptional({
    enum: AuditModeDto,
    example: AuditModeDto.SINGLE,
    description: 'single = 1 URL, site = crawl toan bo domain tu sitemap.xml',
  })
  @IsOptional()
  @IsEnum(AuditModeDto)
  mode?: AuditModeDto;

  @ApiPropertyOptional({
    example: 500,
    description: 'Gioi han URL cho site-mode (mac dinh 500, max 5000)',
    minimum: 1,
    maximum: 5000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  maxUrls?: number;
}

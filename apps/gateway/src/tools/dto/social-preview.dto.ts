import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class SocialPreviewRequestDto {
  @IsEnum(['manual', 'url'])
  mode!: 'manual' | 'url';

  @ValidateIf((o) => o.mode === 'url')
  @IsUrl({ require_protocol: true })
  fetchUrl?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  // --- Open Graph (manual) ---
  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogTitle?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  ogDescription?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ogImage?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ogSiteName?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ogType?: string;

  // --- Twitter (manual) ---
  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(50)
  twitterCard?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(500)
  twitterTitle?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  twitterDescription?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  twitterImage?: string;
}

export interface SocialPreviewWarning {
  field: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

export interface SocialPreviewData {
  url?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  ogImageMeta?: { width: number; height: number; bytes: number };
}

export interface SocialPreviewResponse {
  data: SocialPreviewData;
  warnings: SocialPreviewWarning[];
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}

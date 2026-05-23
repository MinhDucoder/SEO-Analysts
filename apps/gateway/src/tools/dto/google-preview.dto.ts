import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class GooglePreviewRequestDto {
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

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  faviconUrl?: string;
}

export interface GooglePreviewWarning {
  field: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

export interface GooglePreviewData {
  url: string;
  title: string;
  description: string;
  faviconUrl: string;
  breadcrumb: string[];
  displayUrl: string;
}

export interface GooglePreviewResponse {
  data: GooglePreviewData;
  warnings: GooglePreviewWarning[];
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}

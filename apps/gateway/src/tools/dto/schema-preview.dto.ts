import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class SchemaPreviewRequestDto {
  @IsEnum(['paste', 'url'])
  mode!: 'paste' | 'url';

  @ValidateIf((o) => o.mode === 'paste')
  @IsString()
  @MaxLength(200_000)
  raw?: string;

  @ValidateIf((o) => o.mode === 'url')
  @IsUrl({ require_protocol: true })
  fetchUrl?: string;
}

export interface SchemaBlock {
  type: string;
  raw: unknown;
  validation: { errors: string[]; warnings: string[] };
}

export interface SchemaPreviewWarning {
  field: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

export interface SchemaPreviewResponse {
  data: {
    blocks: SchemaBlock[];
    summary: { totalBlocks: number; validBlocks: number; invalidBlocks: number };
  };
  warnings: SchemaPreviewWarning[];
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}

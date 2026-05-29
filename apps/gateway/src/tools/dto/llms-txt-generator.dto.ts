import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class LlmsTxtGeneratorRequestDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeSections?: string[];
}

export interface LlmsTxtGeneratorResponseDto {
  url: string;
  content: string;
  sizeBytes: number;
  warnings: string[];
}

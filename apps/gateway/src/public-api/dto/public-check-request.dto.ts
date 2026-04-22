/**
 * @file Request DTO for POST /api/v1/public/check. Enforces the
 * three-input-types contract (url | markdown | html) with a custom
 * validator ensuring the payload field matches the declared type.
 */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

function OneOfTypeMatching(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'oneOfTypeMatching',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_v: unknown, args: ValidationArguments) {
          const dto = args.object as PublicCheckRequestDto;
          const i = dto.input as PublicCheckInputDto | undefined;
          if (!i) return false;
          switch (i.type) {
            case 'url':
              return typeof i.url === 'string' && !i.markdown && !i.html;
            case 'markdown':
              return typeof i.markdown === 'string' && !i.url && !i.html;
            case 'html':
              return typeof i.html === 'string' && !i.url && !i.markdown;
            default:
              return false;
          }
        },
        defaultMessage: () =>
          'input.type must match exactly one of input.url / input.markdown / input.html',
      },
    });
  };
}

export class PublicCheckInputDto {
  @ApiProperty({ enum: ['url', 'markdown', 'html'] })
  @IsIn(['url', 'markdown', 'html'])
  type!: 'url' | 'markdown' | 'html';

  @ApiProperty({ required: false, format: 'url' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url?: string;

  @ApiProperty({ required: false, description: 'Markdown (≤200 KB)' })
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  markdown?: string;

  @ApiProperty({ required: false, description: 'Raw HTML (≤200 KB)' })
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  html?: string;
}

export class PublicCheckFilterDto {
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audiences?: string[];

  @ApiProperty({ required: false, enum: ['info', 'warning', 'error'] })
  @IsOptional()
  @IsIn(['info', 'warning', 'error'])
  minSeverity?: 'info' | 'warning' | 'error';
}

export class PublicCheckOptionsDto {
  @ApiProperty({ enum: ['off', 'template', 'llm'], required: false, default: 'llm' })
  @IsOptional()
  @IsIn(['off', 'template', 'llm'])
  enrichMode?: 'off' | 'template' | 'llm';

  @ApiProperty({ enum: ['vi', 'en'], required: false, default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  language?: 'vi' | 'en';

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean;

  @ApiProperty({ type: PublicCheckFilterDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PublicCheckFilterDto)
  filter?: PublicCheckFilterDto;
}

export class PublicCheckRequestDto {
  @ApiProperty({ type: PublicCheckInputDto })
  @ValidateNested()
  @Type(() => PublicCheckInputDto)
  @OneOfTypeMatching()
  input!: PublicCheckInputDto;

  @ApiProperty({ example: 'seo 2026' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  targetKeyword!: string;

  @ApiProperty({ required: false, example: ['on-page'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  secondaryKeywords?: string[];

  @ApiProperty({ type: PublicCheckOptionsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PublicCheckOptionsDto)
  options?: PublicCheckOptionsDto;
}

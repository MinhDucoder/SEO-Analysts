import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, Matches } from 'class-validator';
import { AuditModeDto } from '../../audits/dto/create-audit.dto';

// 5-field cron, compatible with BullMQ's node-cron parser:
//   minute hour day-of-month month day-of-week
// e.g. "0 9 * * MON"  — Monday 09:00
const CRON_PATTERN = /^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/;

export class CreateScheduledAuditDto {
  @ApiProperty({ example: 'https://example.com', description: 'URL to audit on the schedule' })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url!: string;

  @ApiProperty({ example: '0 9 * * MON', description: 'Cron expression (5 fields)' })
  @IsString()
  @MaxLength(255)
  @Matches(CRON_PATTERN, { message: 'cron must be a 5-field expression (minute hour dom month dow)' })
  cron!: string;

  @ApiPropertyOptional({ enum: AuditModeDto, example: AuditModeDto.SINGLE })
  @IsOptional()
  @IsEnum(AuditModeDto)
  mode?: AuditModeDto;

  @ApiPropertyOptional({ example: 500, minimum: 1, maximum: 5000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  maxUrls?: number;

  @ApiPropertyOptional({ example: 'seo tools' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  targetKeyword?: string;
}

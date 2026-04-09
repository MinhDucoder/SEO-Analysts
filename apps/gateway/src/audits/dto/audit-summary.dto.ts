import { ApiProperty } from '@nestjs/swagger';
import { AuditStatus } from '@repo/shared';

export class AuditSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() domain!: string;
  @ApiProperty({ enum: AuditStatus }) status!: AuditStatus;
  @ApiProperty({ required: false, nullable: true }) seoScore!: number | null;
  @ApiProperty({ required: false, nullable: true }) targetKeyword!: string | null;
  @ApiProperty({ required: false, nullable: true }) crawlerType!: string | null;
  @ApiProperty({ required: false, nullable: true }) crawlDurationMs!: number | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ required: false, nullable: true }) completedAt!: Date | null;
}

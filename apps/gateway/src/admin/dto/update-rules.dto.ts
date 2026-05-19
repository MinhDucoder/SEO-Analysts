import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RuleUpdate {
  @ApiProperty({ example: 'title_tag', description: 'Ten rule (xem GET /admin/rules)' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 8, minimum: 1, maximum: 10, description: 'Trong so moi (1-10)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  weight?: number;

  @ApiPropertyOptional({ example: true, description: 'Bat/tat rule' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateRulesDto {
  @ApiProperty({ type: [RuleUpdate] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RuleUpdate)
  rules!: RuleUpdate[];
}

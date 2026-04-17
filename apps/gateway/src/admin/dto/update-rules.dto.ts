import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class RuleWeightUpdate {
  @ApiProperty({ example: 'rule_title_tag', description: 'Ten rule (xem GET /admin/rules)' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 8, minimum: 1, maximum: 10, description: 'Trong so moi (1-10)' })
  @IsInt()
  @Min(1)
  @Max(10)
  weight!: number;
}

export class UpdateRulesDto {
  @ApiProperty({ type: [RuleWeightUpdate] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RuleWeightUpdate)
  rules!: RuleWeightUpdate[];
}

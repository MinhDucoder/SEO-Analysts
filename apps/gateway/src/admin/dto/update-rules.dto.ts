import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class RuleWeightUpdate {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ minimum: 1, maximum: 10 })
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

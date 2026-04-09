import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CompareAuditsQuery {
  @ApiProperty()
  @IsUUID()
  audit1!: string;

  @ApiProperty()
  @IsUUID()
  audit2!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CompareAuditsQuery {
  @ApiProperty({ example: 'b0000001-0000-0000-0000-000000000001', description: 'Audit ID lan 1 (google.com, score 92.50)' })
  @IsUUID()
  audit1!: string;

  @ApiProperty({ example: 'b0000001-0000-0000-0000-000000000006', description: 'Audit ID lan 2 (google.com, score 94.10)' })
  @IsUUID()
  audit2!: string;
}

import { IsUrl } from 'class-validator';

export class CreateAuditDto {
  @IsUrl(
    {},
    { message: 'Please provide a valid URL (e.g., https://example.com)' },
  )
  url: string;
}

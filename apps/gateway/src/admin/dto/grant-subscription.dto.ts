import { IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';

export class GrantSubscriptionDto {
  @IsUUID()
  userId!: string;

  @IsIn(['free', 'pro', 'business'])
  planCode!: 'free' | 'pro' | 'business';

  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;
}

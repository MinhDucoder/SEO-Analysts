import { IsIn } from 'class-validator';
import { PlanCode } from '../domain/plan-features';

export class CreatePaymentIntentDto {
  @IsIn(['pro', 'business'])
  planCode!: Exclude<PlanCode, 'free'>;
}

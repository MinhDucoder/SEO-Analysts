import { PlanCode } from '../domain/plan-features';

export class PaymentIntentResponseDto {
  id!: string;
  userId!: string;
  refCode!: string;
  planCode!: PlanCode;
  amountVnd!: number;
  vietqrUrl!: string;
  status!: 'pending' | 'paid' | 'expired' | 'failed';
  expiresAt!: Date;
  paidAt!: Date | null;
}

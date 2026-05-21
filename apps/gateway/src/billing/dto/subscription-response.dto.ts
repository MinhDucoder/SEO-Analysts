import { PlanCode } from '../domain/plan-features';

export class SubscriptionResponseDto {
  id!: string;
  userId!: string;
  planCode!: PlanCode;
  status!: 'active' | 'expired' | 'canceled';
  startedAt!: Date;
  expiresAt!: Date | null;
  canceledAt!: Date | null;
  isAdminGranted!: boolean;
}

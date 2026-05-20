import { PlanCode, PlanDefinition } from '../domain/plan-features';

export class PlanResponseDto {
  code!: PlanCode;
  displayName!: string;
  priceVnd!: number;
  sortOrder!: number;
  features!: PlanDefinition;
}

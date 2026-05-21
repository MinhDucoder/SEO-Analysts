import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PLAN_FEATURES, PlanCode } from '../domain/plan-features';
import { PlanResponseDto } from '../dto/plan-response.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicPlans(): Promise<PlanResponseDto[]> {
    const rows = await this.prisma.plan.findMany({
      where: { isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((p) => this.merge(p));
  }

  async getPlan(code: PlanCode): Promise<PlanResponseDto | null> {
    const row = await this.prisma.plan.findUnique({ where: { code } });
    return row ? this.merge(row) : null;
  }

  private merge(row: {
    code: PlanCode;
    displayName: string;
    priceVnd: number;
    sortOrder: number;
  }): PlanResponseDto {
    return {
      code: row.code,
      displayName: row.displayName,
      priceVnd: row.priceVnd,
      sortOrder: row.sortOrder,
      features: PLAN_FEATURES[row.code],
    };
  }
}

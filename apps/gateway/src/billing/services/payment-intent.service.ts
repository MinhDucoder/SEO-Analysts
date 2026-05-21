import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PlanCode, BILLING_DEFAULTS } from '../domain/plan-features';
import { PaymentIntentResponseDto } from '../dto/payment-intent-response.dto';

// RFC 4648 base32 alphabet without 0/1/8/9
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

@Injectable()
export class PaymentIntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createIntent(userId: string, planCode: PlanCode, amountVnd: number): Promise<PaymentIntentResponseDto> {
    const existing = await this.prisma.paymentIntent.findFirst({
      where: { userId, status: 'pending', expiresAt: { gt: new Date() } },
    });
    if (existing) return this.toDto(existing);

    const ttlMin = Number(this.config.get<string>('BILLING_INTENT_TTL_MINUTES') ?? BILLING_DEFAULTS.INTENT_TTL_MINUTES);
    const refCode = this.generateRefCode();
    const vietqrUrl = this.buildVietQrUrl(amountVnd, refCode);

    const intent = await this.prisma.paymentIntent.create({
      data: {
        userId,
        planCode,
        amountVnd,
        refCode,
        vietqrUrl,
        status: 'pending',
        expiresAt: new Date(Date.now() + ttlMin * 60_000),
      },
    });
    return this.toDto(intent);
  }

  async findById(id: string): Promise<PaymentIntentResponseDto | null> {
    const row = await this.prisma.paymentIntent.findUnique({ where: { id } });
    return row ? this.toDto(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<PaymentIntentResponseDto | null> {
    const row = await this.prisma.paymentIntent.findFirst({ where: { id, userId } });
    return row ? this.toDto(row) : null;
  }

  async findByRefCode(refCode: string) {
    return this.prisma.paymentIntent.findUnique({ where: { refCode } });
  }

  async markPaid(id: string, cassoTxnId: string, subscriptionId: string): Promise<void> {
    await this.prisma.paymentIntent.update({
      where: { id },
      data: { status: 'paid', cassoTxnId, paidAt: new Date(), subscriptionId },
    });
  }

  async listForUser(userId: string, limit = 20): Promise<PaymentIntentResponseDto[]> {
    const rows = await this.prisma.paymentIntent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDto(r));
  }

  private generateRefCode(): string {
    const bytes = randomBytes(5);
    let out = 'SEO';
    for (let i = 0; i < 5; i++) {
      const byte = bytes[i];
      if (byte === undefined) break;
      out += BASE32[byte % 32];
    }
    return out;
  }

  private buildVietQrUrl(amountVnd: number, addInfo: string): string {
    const bin = this.config.get<string>('VIETQR_BANK_BIN');
    const account = this.config.get<string>('VIETQR_ACCOUNT_NO');
    if (!bin || !account) {
      throw new Error('VIETQR_BANK_BIN and VIETQR_ACCOUNT_NO must be configured to create a payment intent');
    }
    const name = this.config.get<string>('VIETQR_ACCOUNT_NAME');
    const enc = encodeURIComponent(name ?? '');
    return `https://img.vietqr.io/image/${bin}-${account}-compact2.jpg?amount=${amountVnd}&addInfo=${addInfo}&accountName=${enc}`;
  }

  private toDto(row: {
    id: string;
    userId: string;
    refCode: string;
    planCode: PlanCode;
    amountVnd: number;
    vietqrUrl: string;
    status: 'pending' | 'paid' | 'expired' | 'failed';
    expiresAt: Date;
    paidAt: Date | null;
  }): PaymentIntentResponseDto {
    return {
      id: row.id,
      userId: row.userId,
      refCode: row.refCode,
      planCode: row.planCode,
      amountVnd: row.amountVnd,
      vietqrUrl: row.vietqrUrl,
      status: row.status,
      expiresAt: row.expiresAt,
      paidAt: row.paidAt,
    };
  }
}

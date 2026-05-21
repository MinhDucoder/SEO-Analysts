import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { CassoReconcilerService, CassoWebhookPayload } from '../services/casso-reconciler.service';
import { InvalidWebhookSignatureError } from '../domain/billing.errors';

@Controller('webhooks/casso')
export class CassoWebhookController {
  constructor(
    private readonly reconciler: CassoReconcilerService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @Public()
  async handle(@Headers('secure-token') token: string | undefined, @Body() body: CassoWebhookPayload) {
    this.verify(token);
    await this.reconciler.handleWebhook(body);
    return { ok: true };
  }

  private verify(token: string | undefined): void {
    const expected = this.config.get<string>('CASSO_WEBHOOK_SECRET');
    if (!expected || !token) throw new InvalidWebhookSignatureError();
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new InvalidWebhookSignatureError();
    }
  }
}

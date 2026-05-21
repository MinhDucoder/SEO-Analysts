import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentIntentService } from '../services/payment-intent.service';
import { PlansService } from '../services/plans.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';

@Controller('billing/payment-intents')
@UseGuards(JwtAuthGuard)
export class PaymentIntentsController {
  constructor(
    private readonly intents: PaymentIntentService,
    private readonly plans: PlansService,
  ) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreatePaymentIntentDto) {
    const plan = await this.plans.getPlan(dto.planCode);
    if (!plan) throw new NotFoundException('Plan not found');
    return this.intents.createIntent(userId, dto.planCode, plan.priceVnd);
  }

  @Get(':id')
  async get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const intent = await this.intents.findById(id);
    if (!intent) throw new NotFoundException();
    const list = await this.intents.listForUser(userId, 50);
    if (!list.some((p) => p.id === id)) throw new NotFoundException();
    return intent;
  }

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return this.intents.listForUser(userId);
  }
}

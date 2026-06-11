import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlanGuard } from '../../common/guards/plan.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { FeatureFlag } from '@repo/shared';
import { LlmsTxtGeneratorService } from '../services/llms-txt-generator.service';
import { LlmsTxtGeneratorRequestDto, LlmsTxtGeneratorResponseDto } from '../dto/llms-txt-generator.dto';

@Controller('tools/llms-txt-generator')
@UseGuards(JwtAuthGuard, PlanGuard)
@RequireFeature(FeatureFlag.GEO_AUDIT)
export class LlmsTxtGeneratorController {
  constructor(private readonly svc: LlmsTxtGeneratorService) {}

  @Post()
  @HttpCode(200)
  async generate(@Body() dto: LlmsTxtGeneratorRequestDto): Promise<LlmsTxtGeneratorResponseDto> {
    return this.svc.generate(dto.url, dto.includeSections);
  }
}

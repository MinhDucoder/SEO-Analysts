/**
 * @file GET /api/v1/public/health — unauthenticated liveness probe.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Public SEO Check')
@Controller('public')
export class PublicHealthController {
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Liveness probe + rule version.' })
  health() {
    return { status: 'ok', ruleVersion: '1.2.0' };
  }
}

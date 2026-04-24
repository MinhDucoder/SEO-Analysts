/**
 * @file GET /api/v1/public/health — unauthenticated liveness probe.
 */
import { Controller, Get, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PublicApiExceptionFilter } from '../filters/public-api-exception.filter';

@ApiTags('Public SEO Check')
@UseFilters(PublicApiExceptionFilter)
@Controller('public')
export class PublicHealthController {
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Liveness probe + rule version.' })
  health() {
    return { status: 'ok', ruleVersion: '1.2.0' };
  }
}

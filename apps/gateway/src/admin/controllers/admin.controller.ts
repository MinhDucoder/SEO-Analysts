/**
 * @file Admin-only REST endpoints (`/admin`) — user management + rule
 * weight tuning + platform stats. Double-guarded: JWT + Roles(ADMIN).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '@repo/shared';
import { AdminService } from '../services/admin.service';
import { AdminApiKeyService } from '../services/admin-api-key.service';
import { ListUsersQuery } from '../dto/list-users.query';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateRulesDto } from '../dto/update-rules.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly adminApiKeys: AdminApiKeyService,
  ) {}

  @Get('users')
  listUsers(@Query() query: ListUsersQuery) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser() me: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(me.id, id, dto);
  }

  @Get('rules')
  listRules() {
    return this.admin.listRules();
  }

  @Put('rules')
  updateRules(@Body() dto: UpdateRulesDto) {
    return this.admin.updateRules(dto);
  }

  @Get('stats')
  getStats(@Query('period') period?: string) {
    const days = period?.endsWith('d') ? parseInt(period, 10) : 30;
    return this.admin.getStats(days);
  }

  // ─── Public API key moderation (cross-user) ───

  @Get('api-keys')
  listAllKeys(
    @Query('userId') userId?: string,
    @Query('environment') environment?: 'live' | 'test',
    @Query('onlyActive') onlyActive?: string,
  ) {
    return this.adminApiKeys.list({
      userId,
      environment,
      onlyActive: onlyActive === 'true',
    });
  }

  @Delete('api-keys/:id')
  @HttpCode(204)
  async revokeKey(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    try {
      await this.adminApiKeys.revoke(id);
    } catch {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'API key not found or already revoked',
      });
    }
  }
}

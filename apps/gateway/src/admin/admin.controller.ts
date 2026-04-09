import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { UserRole } from '@repo/shared';
import { AdminService } from './admin.service';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRulesDto } from './dto/update-rules.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

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
}

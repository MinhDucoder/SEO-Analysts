/**
 * @file CRUD for user-owned API keys. JWT-protected (inherits app-wide
 * JwtAuthGuard). Plaintext returned exactly once on create; afterward
 * only prefix + metadata are exposed.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import {
  ApiKeyDto,
  CreateApiKeyDto,
  CreateApiKeyResponseDto,
} from '../dto/api-key.dto';

interface AuthedRequest extends Request {
  user: { id: string };
}

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('users/me/api-keys')
export class ApiKeysController {
  constructor(private readonly svc: ApiKeyService) {}

  @Post()
  @ApiOperation({
    summary: 'Create API key. Plaintext is returned ONCE — save it immediately.',
  })
  async create(
    @Req() req: AuthedRequest,
    @Body() dto: CreateApiKeyDto,
  ): Promise<CreateApiKeyResponseDto> {
    const { plaintext, record } = await this.svc.create(
      req.user.id,
      dto.name,
      dto.environment,
    );
    return { ...this.toDto(record), plaintext };
  }

  @Get()
  @ApiOperation({ summary: 'List my API keys (plaintext never included).' })
  async list(@Req() req: AuthedRequest): Promise<ApiKeyDto[]> {
    const rows = await this.svc.list(req.user.id);
    return rows.map((r) => this.toDto(r));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke an API key immediately (no undo).' })
  async revoke(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    try {
      await this.svc.revoke(id, req.user.id);
    } catch {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'API key not found or already revoked',
      });
    }
  }

  private toDto(r: {
    id: string;
    name: string;
    prefix: string;
    environment: 'live' | 'test';
    lastUsedAt: Date | null;
    createdAt: Date;
    revokedAt: Date | null;
  }): ApiKeyDto {
    return {
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      environment: r.environment,
      lastUsedAt: r.lastUsedAt,
      createdAt: r.createdAt,
      revokedAt: r.revokedAt,
    };
  }
}

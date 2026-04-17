import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ReportGrpcClient } from '../../infra/grpc/report.client';

@ApiTags('shared')
@Controller('shared')
export class SharedController {
  constructor(private readonly reportClient: ReportGrpcClient) {}

  @Public()
  @Get('audits/:token')
  @ApiOperation({ summary: 'Xem audit duoc share' })
  async view(@Param('token') token: string) {
    if (!token || token.length < 8) {
      throw new NotFoundException('Token khong hop le');
    }
    try {
      return await this.reportClient.getSharedReport(token);
    } catch {
      throw new NotFoundException('Share link khong ton tai hoac da bi thu hoi');
    }
  }
}

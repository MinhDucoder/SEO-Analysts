import { Module } from '@nestjs/common';
import { SharedController } from './controllers/shared.controller';

@Module({
  controllers: [SharedController],
})
export class SharedModule {}

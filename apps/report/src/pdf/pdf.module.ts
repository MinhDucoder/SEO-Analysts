import { Module } from '@nestjs/common';
import { BrowserPool } from './browser-pool';
import { PdfGenerator } from './pdf.generator';

@Module({
  providers: [BrowserPool, PdfGenerator],
  exports: [PdfGenerator],
})
export class PdfModule {}

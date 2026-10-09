import { Module } from '@nestjs/common';
import { SopOfficialPdfService } from './sop-official-pdf.service';
import { SopPdfStorageService } from './sop-pdf-storage.service';
import { SopPdfReconciliationService } from './sop-pdf-reconciliation.service';

@Module({
  providers: [SopOfficialPdfService, SopPdfStorageService, SopPdfReconciliationService],
  exports: [SopOfficialPdfService, SopPdfStorageService],
})
export class SopPdfModule {}

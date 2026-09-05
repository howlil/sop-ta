import { Module } from '@nestjs/common';
import { SopPdfModule } from '../../sop/pdf/sop-pdf.module';
import { TteSharedModule } from '../shared/tte-shared.module';
import { TtePenandatangananService } from './tte-penandatanganan.service';
import { TtePdfSigningService } from './tte-pdf-signing.service';
import { DOCUMENT_SIGNING_PROVIDER } from './signing/document-signing.provider';
import { InternalP12SigningProvider } from './signing/internal-p12-signing.provider';

@Module({
  imports: [TteSharedModule, SopPdfModule],
  providers: [
    TtePenandatangananService,
    TtePdfSigningService,
    InternalP12SigningProvider,
    {
      provide: DOCUMENT_SIGNING_PROVIDER,
      useExisting: InternalP12SigningProvider,
    },
  ],
  exports: [TtePenandatangananService, TtePdfSigningService],
})
export class TtePenandatangananModule {}

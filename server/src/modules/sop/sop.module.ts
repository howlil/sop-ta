import { Module } from '@nestjs/common';
import { SopCatalogModule } from './catalog/sop-catalog.module';
import { SopDiagramModule } from './diagram/sop-diagram.module';
import { PelaksanaModule } from './pelaksana/pelaksana.module';
import { SopProsedurModule } from './prosedur/sop-prosedur.module';
import { SopPublicModule } from './public/sop-public.module';

/** Root composition boundary for SOP-facing HTTP capabilities. */
@Module({
  imports: [
    SopCatalogModule,
    SopPublicModule,
    SopProsedurModule,
    SopDiagramModule,
    PelaksanaModule,
  ],
})
export class SopModule {}

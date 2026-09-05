import { Module } from '@nestjs/common';
import { EvaluasiGrafikModule } from './grafik/evaluasi-grafik.module';
import { EvaluasiNilaiModule } from './nilai/evaluasi-nilai.module';
import { PengajuanEvaluasiDetailModule } from './pengajuan-detail/pengajuan-evaluasi-detail.module';
import { PengajuanEvaluasiModule } from './pengajuan/pengajuan-evaluasi.module';
import { EvaluasiUmpanBalikModule } from './umpan-balik/evaluasi-umpan-balik.module';
import { EvaluasiWorkspaceModule } from './workspace/evaluasi-workspace.module';

/** Root composition boundary for evaluation capabilities. */
@Module({
  imports: [
    EvaluasiNilaiModule,
    PengajuanEvaluasiModule,
    PengajuanEvaluasiDetailModule,
    EvaluasiWorkspaceModule,
    EvaluasiUmpanBalikModule,
    EvaluasiGrafikModule,
  ],
})
export class EvaluationModule {}

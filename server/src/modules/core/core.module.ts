import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { EvaluatorModule } from './evaluator/evaluator.module';
import { KepalaOpdModule } from './kepala-opd/kepala-opd.module';
import { OpdModule } from './opd/opd.module';
import { PenggunaModule } from './pengguna/pengguna.module';
import { PenyusunModule } from './penyusun/penyusun.module';
import { PeraturanModule } from './peraturan/peraturan.module';

/** Root composition boundary for core identity, organization, and actor capabilities. */
@Module({
  imports: [
    AuthModule,
    OpdModule,
    PenggunaModule,
    EvaluatorModule,
    KepalaOpdModule,
    PenyusunModule,
    PeraturanModule,
  ],
})
export class CoreModule {}

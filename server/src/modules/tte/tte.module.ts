import { Module } from '@nestjs/common';
import { TteCoreModule } from './core/tte-core.module';

/** Root composition boundary for TTE capabilities. */
@Module({
  imports: [TteCoreModule],
})
export class TteModule {}

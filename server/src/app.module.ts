import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { CommonModule } from './common/common.module';
import { WinstonLoggerConfig } from './common/logger/winston.config';
import { PrismaModule } from './common/prisma/prisma.module';
import { validateEnv } from './config/env.validation';
import { CoreModule } from './modules/core/core.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { NotificationModule } from './modules/notifications/reminders/notification.module';
import { SopModule } from './modules/sop/sop.module';
import { TteModule } from './modules/tte/tte.module';
import { WorkItemsModule } from './modules/work-items/work-items.module';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [
        '.env',
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        `.env.${process.env.NODE_ENV ?? 'development'}.local`,
      ],
      validate: validateEnv,
    }),
    WinstonModule.forRoot(WinstonLoggerConfig),
    PrismaModule,
    CoreModule,
    SopModule,
    EvaluationModule,
    TteModule,
    NotificationModule,
    WorkItemsModule,
  ],
})
export class AppModule {}

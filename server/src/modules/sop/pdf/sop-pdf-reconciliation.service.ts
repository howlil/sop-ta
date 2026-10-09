import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SopPdfStorageService } from './sop-pdf-storage.service';

type ReconciliationStats = { scanned: number; deleted: number; referenced: number };

@Injectable()
export class SopPdfReconciliationService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SopPdfReconciliationService.name);
  private readonly enabled: boolean;
  private readonly minAgeMs: number;
  private readonly intervalMs: number;
  private interval?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly storage: SopPdfStorageService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('SOP_PDF_RECONCILIATION_ENABLED', true);
    this.minAgeMs = config.get<number>('SOP_PDF_ORPHAN_MIN_AGE_HOURS', 24) * 3_600_000;
    this.intervalMs =
      config.get<number>('SOP_PDF_RECONCILIATION_INTERVAL_HOURS', 6) * 3_600_000;
  }

  onApplicationBootstrap(): void {
    if (!this.enabled) return;
    this.interval = setInterval(() => void this.tick(), this.intervalMs);
    this.interval.unref();
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async tick(): Promise<void> {
    if (!this.enabled || this.running) return;
    this.running = true;
    try {
      const result = await this.reconcile();
      if (result.scanned > 0) {
        this.logger.log(
          'PDF orphan reconciliation scanned=' + result.scanned +
            ' deleted=' + result.deleted + ' referenced=' + result.referenced,
        );
      }
    } catch (error) {
      this.logger.error(
        'PDF reconciliation failed; remaining files preserved: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      this.running = false;
    }
  }

  async reconcile(now: Date = new Date()): Promise<ReconciliationStats> {
    const cutoff = new Date(now.getTime() - this.minAgeMs);
    const stale = await this.storage.listStaleAttemptFiles(cutoff);
    const stats: ReconciliationStats = { scanned: stale.length, deleted: 0, referenced: 0 };
    for (const candidate of stale) {
      // Preserve paths referenced by any TTE document, including revoked/superseded.
      // A database failure aborts cleanup; we never assume missing references.
      const count = await this.prisma.dokumenTte.count({ where: { pdfPath: candidate } });
      if (count > 0) {
        stats.referenced++;
        continue;
      }
      if (await this.storage.deleteStaleAttemptFile(candidate, cutoff)) stats.deleted++;
    }
    return stats;
  }
}

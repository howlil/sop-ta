import { ConfigService } from '@nestjs/config';
import { mkdtemp, mkdir, rm, utimes, writeFile, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import type { PrismaService } from '../../../common/prisma/prisma.service';
import { SopPdfStorageService } from './sop-pdf-storage.service';
import { SopPdfReconciliationService } from './sop-pdf-reconciliation.service';

describe('SOP PDF crash recovery', () => {
  let root: string;
  let storage: SopPdfStorageService;
  let referenced: Set<string>;
  let prisma: PrismaService;
  let reconciliation: SopPdfReconciliationService;
  const now = new Date('2026-10-09T09:00:00.000Z');
  const opdId = '11111111-1111-4111-8111-111111111111';
  const sopId = '22222222-2222-4222-8222-222222222222';
  const detailSopId = '33333333-3333-4333-8333-333333333333';

  const configFor = (path: string) =>
    new ConfigService({
      SOP_PDF_STORAGE_DIR: path,
      SOP_PDF_ORPHAN_MIN_AGE_HOURS: 24,
      SOP_PDF_RECONCILIATION_INTERVAL_HOURS: 6,
    });

  const createFile = async (attemptId: string, hoursOld: number, temporary = false) => {
    const base = storage.buildRelativePath({
      opdId,
      sopId,
      detailSopId,
      versi: 1,
      attemptId,
    });
    const relativePath = temporary ? base + '.tmp-1-1000' : base;
    const absolutePath = join(root, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, '%PDF-1.7');
    const modified = new Date(now.getTime() - hoursOld * 3_600_000);
    await utimes(absolutePath, modified, modified);
    return relativePath;
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'sop-pdf-recovery-'));
    referenced = new Set<string>();
    storage = new SopPdfStorageService(configFor(root));
    prisma = {
      dokumenTte: {
        count: jest.fn(({ where }: { where: { pdfPath: string } }) =>
          Promise.resolve(referenced.has(where.pdfPath) ? 1 : 0),
        ),
      },
    } as unknown as PrismaService;
    reconciliation = new SopPdfReconciliationService(storage, prisma, configFor(root));
  });

  afterEach(async () => {
    reconciliation.onModuleDestroy();
    await rm(root, { recursive: true, force: true });
  });

  it('deletes only expired unreferenced signing attempts, including crash temp files', async () => {
    const orphan = await createFile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 48);
    const published = await createFile('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 48);
    const recent = await createFile('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 2);
    const tmp = await createFile('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 48, true);
    const legacy = storage.buildRelativePath({ opdId, sopId, detailSopId, versi: 1 });
    const legacyPath = join(root, legacy);
    await writeFile(legacyPath, 'LEGACY');
    await utimes(legacyPath, new Date('2026-01-01'), new Date('2026-01-01'));

    referenced.add(published);
    const result = await reconciliation.reconcile(now);
    expect(result).toEqual({ scanned: 3, deleted: 2, referenced: 1 });
    await expect(stat(join(root, orphan))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(stat(join(root, tmp))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(stat(join(root, published))).resolves.toBeDefined();
    await expect(stat(join(root, recent))).resolves.toBeDefined();
    await expect(stat(legacyPath)).resolves.toBeDefined();
  });

  it('preserves files on a database lookup failure', async () => {
    const orphan = await createFile('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 72);
    jest.spyOn(prisma.dokumenTte, 'count').mockRejectedValueOnce(new Error('database offline'));
    await expect(reconciliation.reconcile(now)).rejects.toThrow('database offline');
    await expect(stat(join(root, orphan))).resolves.toBeDefined();
  });

  it('rechecks age before deletion when an attempt becomes active again', async () => {
    const path = await createFile('ffffffff-ffff-4fff-8fff-ffffffffffff', 48);
    const cutoff = new Date(now.getTime() - 24 * 3_600_000);
    expect(await storage.listStaleAttemptFiles(cutoff)).toContain(path);
    await utimes(join(root, path), now, now);
    await expect(storage.deleteStaleAttemptFile(path, cutoff)).resolves.toBe(false);
    await expect(stat(join(root, path))).resolves.toBeDefined();
  });
});

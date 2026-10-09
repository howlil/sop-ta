import { PeranPengguna, StatusPengajuanEvaluasi, StatusSOP } from '../../../../generated/prisma';
import { toWibDateOnly } from '../../../../common/date/wib-date.util';
import type { PrismaService } from '../../../../common/prisma/prisma.service';
import { TteRepository } from './tte.repository';

describe('TTE batch transaction atomicity', () => {
  const signedAt = new Date('2026-05-19T14:30:00+07:00');
  const expectedTanggalEfektif = toWibDateOnly(signedAt);
  const mkDetail = (id: string, number: string) => ({
    detailSopId: id,
    sopId: `sop-${id}`,
    nomorSOP: number,
    versi: 1,
    status: StatusSOP.DIVERIFIKASI_PJ_EVALUATOR_ORGANISASI,
    sop: { opdId: 'opd-1', judul: number },
  });
  const detail1 = mkDetail('d-1', 'SOP-1');
  const detail2 = mkDetail('d-2', 'SOP-2');
  const pengajuan = {
    opdId: 'opd-1',
    status: StatusPengajuanEvaluasi.DITANDATANGANI_PJ_PENYUSUN,
    version: 7,
    nilaiEvaluasi: [{ detailSop: detail1 }, { detailSop: detail2 }],
  };

  it('rolls back document preparation if the second document has an invalid parent', async () => {
    let committed = false;
    let rolledBack = false;
    const tx = {
      pengajuanEvaluasi: { findUnique: jest.fn().mockResolvedValue(pengajuan) },
      dokumenTte: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
          dokumenTteId: 'bad',
          detailSopId: 'd-2',
          pengajuanEvaluasiId: 'p-other',
        }),
        create: jest.fn().mockResolvedValue({
          dokumenTteId: 'doc-1',
          detailSopId: 'd-1',
          pengajuanEvaluasiId: null,
        }),
      },
      riwayatTandaTangan: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (inner: typeof tx) => Promise<unknown>) => {
        try {
          const value = await callback(tx);
          committed = true;
          return value;
        } catch (error) {
          rolledBack = true;
          throw error;
        }
      }),
    };
    const repository = new TteRepository(prisma as unknown as PrismaService);
    const result = await repository.prepareSopPengesahanDocuments({
      pengajuanEvaluasiId: 'p-1',
      userId: 'u-1',
      userOpdId: 'opd-1',
      peran: PeranPengguna.KEPALA_OPD,
      hashDokumen: 'hash',
      nomorDokumen: 'DOC',
      judulDokumen: 'Document',
      expectedDetailSopIds: ['d-1', 'd-2'],
    });
    expect(result).toMatchObject({ error: 'INVALID_DOC_PARENT', detailSopId: 'd-2' });
    expect(tx.dokumenTte.create.mock.calls).toHaveLength(1);
    expect(rolledBack).toBe(true);
    expect(committed).toBe(false);
  });

  it('rolls back the entire publication when a later signed artifact is invalid', async () => {
    let committed = false;
    let rolledBack = false;
    const tx = {
      pengajuanEvaluasi: {
        findUnique: jest.fn().mockResolvedValue(pengajuan),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      dokumenTte: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ dokumenTteId: 'doc-1' })
          .mockResolvedValueOnce({ dokumenTteId: 'unexpected-doc' }),
      },
      riwayatTandaTangan: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      },
      detailSOP: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (inner: typeof tx) => Promise<unknown>) => {
        try {
          const value = await callback(tx);
          committed = true;
          return value;
        } catch (error) {
          rolledBack = true;
          throw error;
        }
      }),
    };
    const metadata = {
      signatureValue: 'signature',
      signatureAlgorithm: 'SHA256withRSA',
      signatureFormat: 'PKCS7_DETACHED',
      certSerialNumber: '1',
      certIssuer: 'issuer',
      certSubject: 'subject',
      certFingerprint: 'fingerprint',
      certValidFrom: signedAt,
      certValidTo: signedAt,
    };
    const repository = new TteRepository(prisma as unknown as PrismaService);
    const result = await repository.finalizeSopPengesahanWithArtifacts({
      pengajuanEvaluasiId: 'p-1',
      userId: 'u-1',
      userOpdId: 'opd-1',
      peran: PeranPengguna.KEPALA_OPD,
      signedAt,
      tanggalEfektif: expectedTanggalEfektif,
      artifacts: [
        {
          detailSopId: 'd-1',
          dokumenTteId: 'doc-1',
          pdfPath: 'first.pdf',
          pdfSha256: 'hash-1',
          pdfSizeBytes: 10,
          signatureMetadata: metadata,
        },
        {
          detailSopId: 'd-2',
          dokumenTteId: 'doc-2',
          pdfPath: 'second.pdf',
          pdfSha256: 'hash-2',
          pdfSizeBytes: 20,
          signatureMetadata: metadata,
        },
      ],
    });
    expect(result).toMatchObject({ error: 'INVALID_DOC_PARENT', detailSopId: 'd-2' });
    expect(tx.pengajuanEvaluasi.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          pengajuanEvaluasiId: 'p-1',
          version: 7,
          status: StatusPengajuanEvaluasi.DITANDATANGANI_PJ_PENYUSUN,
        },
      }),
    );
    expect(tx.riwayatTandaTangan.create.mock.calls).toHaveLength(1);
    expect(rolledBack).toBe(true);
    expect(committed).toBe(false);
  });
});

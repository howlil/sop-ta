import type { JwtAccessPayload } from '../../common';
import {
  PeranPengguna,
  StatusPengajuanEvaluasi,
  StatusSOP,
} from '../../generated/prisma';
import type {
  WorkItemPengajuanRow,
  WorkItemSopRow,
  WorkItemsRepository,
} from './work-items.repository';
import { WorkItemsService } from './work-items.service';

const now = new Date('2026-09-06T10:00:00.000Z');

function user(peran: PeranPengguna): JwtAccessPayload {
  return { sub: `user-${peran}`, email: `${peran}@test.id`, peran };
}

function sopRow(status: StatusSOP, id = 'detail-1'): WorkItemSopRow {
  return {
    detailSopId: id,
    nomorSOP: `SOP-${id}`,
    status,
    updatedAt: now,
    sop: { judul: `SOP ${id}`, opdId: 'opd-a' },
  };
}

function pengajuanRow(
  status: StatusPengajuanEvaluasi,
  detailStatuses: readonly StatusSOP[] = [],
): WorkItemPengajuanRow {
  return {
    pengajuanEvaluasiId: 'pengajuan-1',
    opdId: 'opd-a',
    nomorBA: 'BA-001',
    status,
    updatedAt: now,
    opd: { nama: 'Dinas A' },
    nilaiEvaluasi: detailStatuses.map((detailStatus, index) => ({
      detailSopId: `detail-${index + 1}`,
      detailSop: {
        detailSopId: `detail-${index + 1}`,
        nomorSOP: `SOP-${index + 1}`,
        status: detailStatus,
        updatedAt: now,
        sop: { judul: `SOP ${index + 1}` },
      },
    })),
  };
}

function buildRepository(overrides: Partial<WorkItemsRepository> = {}): WorkItemsRepository {
  return {
    findUserOpdId: jest.fn().mockResolvedValue('opd-a'),
    findSopCandidates: jest.fn().mockResolvedValue([]),
    findPengajuanCandidates: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as WorkItemsRepository;
}

describe('WorkItemsService', () => {
  it('memproyeksikan seluruh pengajuan aktif untuk Evaluator tanpa filter OPD', async () => {
    const findPengajuanCandidates = jest
      .fn()
      .mockResolvedValue([pengajuanRow(StatusPengajuanEvaluasi.SEDANG_DIEVALUASI)]);
    const repository = buildRepository({ findPengajuanCandidates });
    const service = new WorkItemsService(repository);

    const result = await service.findMine(user(PeranPengguna.EVALUATOR));

    expect(findPengajuanCandidates).toHaveBeenCalledWith([
      StatusPengajuanEvaluasi.SEDANG_DIEVALUASI,
    ]);
    expect(result.items).toEqual([
      expect.objectContaining({
        kind: 'EVALUATE_SUBMISSION',
        actionHref: '/evaluator/evaluasi/pengajuan/pengajuan-1',
      }),
    ]);
  });

  it('membatasi pekerjaan PJ Penyusun ke OPD sesi dan menggabungkan authoring dengan tanda tangan BA', async () => {
    const findSopCandidates = jest
      .fn()
      .mockResolvedValue([sopRow(StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI)]);
    const findPengajuanCandidates = jest
      .fn()
      .mockResolvedValue([
        pengajuanRow(StatusPengajuanEvaluasi.DITANDATANGANI_PJ_EVALUATOR),
      ]);
    const repository = buildRepository({ findSopCandidates, findPengajuanCandidates });
    const service = new WorkItemsService(repository);

    const result = await service.findMine(user(PeranPengguna.PJ_PENYUSUN));

    expect(findSopCandidates).toHaveBeenCalledWith(
      'opd-a',
      expect.arrayContaining([StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI]),
    );
    expect(findPengajuanCandidates).toHaveBeenCalledWith(
      [StatusPengajuanEvaluasi.DITANDATANGANI_PJ_EVALUATOR],
      'opd-a',
    );
    expect(result.items.map((item) => item.kind)).toEqual(
      expect.arrayContaining(['SUBMIT_EVALUATION', 'SIGN_EVALUATION_BA_PJ_PENYUSUN']),
    );
  });

  it('Kepala OPD hanya menerima SOP pada paket yang benar-benar siap disahkan', async () => {
    const findPengajuanCandidates = jest.fn().mockResolvedValue([
      pengajuanRow(StatusPengajuanEvaluasi.DITANDATANGANI_PJ_PENYUSUN, [
        StatusSOP.DIVERIFIKASI_PJ_EVALUATOR_ORGANISASI,
        StatusSOP.BERLAKU,
      ]),
    ]);
    const repository = buildRepository({ findPengajuanCandidates });
    const service = new WorkItemsService(repository);

    const result = await service.findMine(user(PeranPengguna.KEPALA_OPD));

    expect(findPengajuanCandidates).toHaveBeenCalledWith(
      [StatusPengajuanEvaluasi.DITANDATANGANI_PJ_PENYUSUN],
      'opd-a',
    );
    expect(result).toEqual({
      count: 1,
      items: [
        expect.objectContaining({
          kind: 'APPROVE_SOP',
          targetId: 'detail-1',
          actionHref: '/kepala-opd/sop/detail-1',
        }),
      ],
    });
  });

  it('mengembalikan queue kosong ketika akun tidak lagi memiliki OPD aktif', async () => {
    const findSopCandidates = jest.fn();
    const findPengajuanCandidates = jest.fn();
    const repository = buildRepository({
      findUserOpdId: jest.fn().mockResolvedValue(null),
      findSopCandidates,
      findPengajuanCandidates,
    });
    const service = new WorkItemsService(repository);

    await expect(service.findMine(user(PeranPengguna.PENYUSUN))).resolves.toEqual({
      items: [],
      count: 0,
    });
    expect(findSopCandidates).not.toHaveBeenCalled();
    expect(findPengajuanCandidates).not.toHaveBeenCalled();
  });
});

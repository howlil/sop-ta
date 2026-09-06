import { Injectable } from '@nestjs/common';
import type { JwtAccessPayload } from '../../common';
import { PeranPengguna, StatusPengajuanEvaluasi, StatusSOP } from '../../generated/prisma';
import {
  WorkItemsRepository,
  type WorkItemPengajuanRow,
  type WorkItemSopRow,
} from './work-items.repository';
import type { WorkItem, WorkItemsResponse } from './work-item.types';

const AUTHORING_STATUSES = [StatusSOP.DRAFT, StatusSOP.SEDANG_DISUSUN] as const;
const PENYUSUN_ACTIONABLE_STATUSES = [
  ...AUTHORING_STATUSES,
  StatusSOP.REVISI_DARI_EVALUATOR,
] as const;
const PJ_PENYUSUN_ACTIONABLE_STATUSES = [
  ...PENYUSUN_ACTIONABLE_STATUSES,
  StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
] as const;

function sopWorkItem(row: WorkItemSopRow): WorkItem {
  if (row.status === StatusSOP.REVISI_DARI_EVALUATOR) {
    return {
      id: `sop-revision:${row.detailSopId}`,
      kind: 'SOP_REVISION',
      targetId: row.detailSopId,
      title: row.sop.judul,
      context: `${row.nomorSOP} · Perlu tindak lanjut evaluator`,
      stage: 'REVISION',
      actionLabel: 'Perbaiki SOP',
      actionHref: `/penyusun/sop/${row.detailSopId}`,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  if (row.status === StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI) {
    return {
      id: `submit-evaluation:${row.detailSopId}`,
      kind: 'SUBMIT_EVALUATION',
      targetId: row.detailSopId,
      title: row.sop.judul,
      context: `${row.nomorSOP} · Siap masuk pengajuan evaluasi`,
      stage: 'READY_FOR_EVALUATION',
      actionLabel: 'Ajukan evaluasi',
      actionHref: '/penyusun/sop?ajukan=1',
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  return {
    id: `sop-draft:${row.detailSopId}`,
    kind: 'SOP_DRAFT',
    targetId: row.detailSopId,
    title: row.sop.judul,
    context: `${row.nomorSOP} · Draft belum selesai`,
    stage: 'AUTHORING',
    actionLabel: 'Lanjutkan SOP',
    actionHref: `/penyusun/sop/${row.detailSopId}`,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function evaluationWorkItem(row: WorkItemPengajuanRow, role: PeranPengguna): WorkItem | null {
  const countLabel = `${row.nilaiEvaluasi.length} SOP`;
  const baLabel = row.nomorBA ? ` · BA ${row.nomorBA}` : '';

  if (
    role === PeranPengguna.EVALUATOR &&
    row.status === StatusPengajuanEvaluasi.SEDANG_DIEVALUASI
  ) {
    return {
      id: `evaluate:${row.pengajuanEvaluasiId}`,
      kind: 'EVALUATE_SUBMISSION',
      targetId: row.pengajuanEvaluasiId,
      title: `Evaluasi SOP — ${row.opd.nama}`,
      context: `${countLabel}${baLabel}`,
      stage: 'PROCESS_REVIEW',
      actionLabel: 'Lanjut evaluasi',
      actionHref: `/evaluator/evaluasi/pengajuan/${row.pengajuanEvaluasiId}`,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  if (
    role === PeranPengguna.PJ_EVALUATOR &&
    row.status === StatusPengajuanEvaluasi.SELESAI_DIEVALUASI
  ) {
    return {
      id: `sign-ba-pj-evaluator:${row.pengajuanEvaluasiId}`,
      kind: 'SIGN_EVALUATION_BA_PJ_EVALUATOR',
      targetId: row.pengajuanEvaluasiId,
      title: `Berita Acara — ${row.opd.nama}`,
      context: `${countLabel} · Evaluasi selesai`,
      stage: 'FINAL_APPROVAL',
      actionLabel: 'Tandatangani BA',
      actionHref: `/pj-evaluator/evaluasi/${row.pengajuanEvaluasiId}`,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  if (
    role === PeranPengguna.PJ_PENYUSUN &&
    row.status === StatusPengajuanEvaluasi.DITANDATANGANI_PJ_EVALUATOR
  ) {
    return {
      id: `sign-ba-pj-penyusun:${row.pengajuanEvaluasiId}`,
      kind: 'SIGN_EVALUATION_BA_PJ_PENYUSUN',
      targetId: row.pengajuanEvaluasiId,
      title: `Berita Acara — ${row.opd.nama}`,
      context: `${countLabel} · Sudah ditandatangani PJ Evaluator`,
      stage: 'TTE',
      actionLabel: 'Tandatangani BA',
      actionHref: `/penyusun/pj-penyusun/berita-acara/${row.pengajuanEvaluasiId}`,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  return null;
}

function kepalaOpdItems(row: WorkItemPengajuanRow): WorkItem[] {
  if (row.status !== StatusPengajuanEvaluasi.DITANDATANGANI_PJ_PENYUSUN) {
    return [];
  }

  return row.nilaiEvaluasi
    .filter(
      ({ detailSop }) => detailSop.status === StatusSOP.DIVERIFIKASI_PJ_EVALUATOR_ORGANISASI,
    )
    .map(({ detailSop }) => ({
      id: `approve-sop:${detailSop.detailSopId}`,
      kind: 'APPROVE_SOP' as const,
      targetId: detailSop.detailSopId,
      title: detailSop.sop.judul,
      context: `${detailSop.nomorSOP} · ${row.opd.nama} · Menunggu pengesahan`,
      stage: 'TTE',
      actionLabel: 'Sahkan SOP',
      actionHref: `/kepala-opd/sop/${detailSop.detailSopId}`,
      updatedAt: detailSop.updatedAt.toISOString(),
    }));
}

@Injectable()
export class WorkItemsService {
  constructor(private readonly repository: WorkItemsRepository) {}

  async findMine(user: JwtAccessPayload): Promise<WorkItemsResponse> {
    const opdId = await this.repository.findUserOpdId(user.sub);
    if (opdId === null) {
      return { items: [], count: 0 };
    }

    let items: WorkItem[] = [];

    switch (user.peran) {
      case PeranPengguna.PENYUSUN: {
        const rows = await this.repository.findSopCandidates(opdId, PENYUSUN_ACTIONABLE_STATUSES);
        items = rows.map(sopWorkItem);
        break;
      }
      case PeranPengguna.PJ_PENYUSUN: {
        const [sopRows, pengajuanRows] = await Promise.all([
          this.repository.findSopCandidates(opdId, PJ_PENYUSUN_ACTIONABLE_STATUSES),
          this.repository.findPengajuanCandidates(
            [StatusPengajuanEvaluasi.DITANDATANGANI_PJ_EVALUATOR],
            opdId,
          ),
        ]);
        items = [
          ...sopRows.map(sopWorkItem),
          ...pengajuanRows
            .map((row) => evaluationWorkItem(row, user.peran))
            .filter((item): item is WorkItem => item !== null),
        ];
        break;
      }
      case PeranPengguna.EVALUATOR: {
        const rows = await this.repository.findPengajuanCandidates([
          StatusPengajuanEvaluasi.SEDANG_DIEVALUASI,
        ]);
        items = rows
          .map((row) => evaluationWorkItem(row, user.peran))
          .filter((item): item is WorkItem => item !== null);
        break;
      }
      case PeranPengguna.PJ_EVALUATOR: {
        const rows = await this.repository.findPengajuanCandidates([
          StatusPengajuanEvaluasi.SELESAI_DIEVALUASI,
        ]);
        items = rows
          .map((row) => evaluationWorkItem(row, user.peran))
          .filter((item): item is WorkItem => item !== null);
        break;
      }
      case PeranPengguna.KEPALA_OPD: {
        const rows = await this.repository.findPengajuanCandidates(
          [StatusPengajuanEvaluasi.DITANDATANGANI_PJ_PENYUSUN],
          opdId,
        );
        items = rows.flatMap(kepalaOpdItems);
        break;
      }
    }

    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return { items, count: items.length };
  }
}

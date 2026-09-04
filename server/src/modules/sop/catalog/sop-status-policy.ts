import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PeranPengguna, StatusSOP } from '../../../generated/prisma';

export type SopWorkflowAction =
  | 'EDIT'
  | 'SUBMIT_FOR_REVIEW'
  | 'SUBMIT_EVALUATION'
  | 'RESUBMIT_EVALUATION'
  | 'SIGN'
  | 'REVOKE'
  | 'VIEW_HISTORY';

export type SopWorkflowStage =
  | 'AUTHORING'
  | 'PROCESS_REVIEW'
  | 'FINAL_APPROVAL'
  | 'EFFECTIVE'
  | 'SUPERSEDED'
  | 'REVOKED';

export type SopWorkflowProjection = Readonly<{
  stage: SopWorkflowStage;
  stateLabel: string;
  allowedActions: readonly SopWorkflowAction[];
}>;

export type SopStatusTransitionInput = {
  role: PeranPengguna;
  current: StatusSOP;
  target: StatusSOP;
};

export type SopWorkflowActionInput = {
  role: PeranPengguna;
  status: StatusSOP;
  action: SopWorkflowAction;
};

type TransitionRule = Readonly<{
  target: StatusSOP;
  roles: readonly PeranPengguna[];
}>;

const AUTHORING_ROLES = new Set<PeranPengguna>([PeranPengguna.PENYUSUN, PeranPengguna.PJ_PENYUSUN]);

const TRANSITIONS: Readonly<Partial<Record<StatusSOP, readonly TransitionRule[]>>> = {
  [StatusSOP.DRAFT]: [
    {
      target: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      roles: [PeranPengguna.PENYUSUN, PeranPengguna.PJ_PENYUSUN],
    },
  ],
  [StatusSOP.SEDANG_DISUSUN]: [
    {
      target: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      roles: [PeranPengguna.PENYUSUN, PeranPengguna.PJ_PENYUSUN],
    },
  ],
  [StatusSOP.REVISI_DARI_EVALUATOR]: [
    {
      target: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      roles: [PeranPengguna.PENYUSUN, PeranPengguna.PJ_PENYUSUN],
    },
  ],
  [StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI]: [
    {
      target: StatusSOP.DIAJUKAN_EVALUASI,
      roles: [PeranPengguna.PJ_PENYUSUN],
    },
  ],
  [StatusSOP.BERLAKU]: [
    {
      target: StatusSOP.DICABUT,
      roles: [PeranPengguna.KEPALA_OPD],
    },
  ],
};

const STAGE_BY_STATUS: Readonly<Record<StatusSOP, SopWorkflowStage>> = {
  [StatusSOP.DRAFT]: 'AUTHORING',
  [StatusSOP.SEDANG_DISUSUN]: 'AUTHORING',
  [StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI]: 'AUTHORING',
  [StatusSOP.DIAJUKAN_EVALUASI]: 'PROCESS_REVIEW',
  [StatusSOP.SEDANG_DIEVALUASI]: 'PROCESS_REVIEW',
  [StatusSOP.REVISI_DARI_EVALUATOR]: 'AUTHORING',
  [StatusSOP.DITOLAK_EVALUATOR]: 'AUTHORING',
  [StatusSOP.MENUNGGU_TTD_PJ_EVALUATOR]: 'FINAL_APPROVAL',
  [StatusSOP.DIVERIFIKASI_PJ_EVALUATOR_ORGANISASI]: 'FINAL_APPROVAL',
  [StatusSOP.BERLAKU]: 'EFFECTIVE',
  [StatusSOP.DIGANTIKAN]: 'SUPERSEDED',
  [StatusSOP.DICABUT]: 'REVOKED',
};

const STATE_LABEL_BY_STATUS: Readonly<Record<StatusSOP, string>> = {
  [StatusSOP.DRAFT]: 'Draft',
  [StatusSOP.SEDANG_DISUSUN]: 'Sedang disusun',
  [StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI]: 'Siap diajukan',
  [StatusSOP.DIAJUKAN_EVALUASI]: 'Diajukan ke evaluasi',
  [StatusSOP.SEDANG_DIEVALUASI]: 'Sedang dievaluasi',
  [StatusSOP.REVISI_DARI_EVALUATOR]: 'Perlu revisi',
  [StatusSOP.DITOLAK_EVALUATOR]: 'Ditolak evaluator',
  [StatusSOP.MENUNGGU_TTD_PJ_EVALUATOR]: 'Menunggu verifikasi akhir',
  [StatusSOP.DIVERIFIKASI_PJ_EVALUATOR_ORGANISASI]: 'Siap disahkan',
  [StatusSOP.BERLAKU]: 'Berlaku',
  [StatusSOP.DIGANTIKAN]: 'Digantikan',
  [StatusSOP.DICABUT]: 'Dicabut',
};

const EDITABLE_STATUSES = new Set<StatusSOP>([
  StatusSOP.DRAFT,
  StatusSOP.SEDANG_DISUSUN,
  StatusSOP.REVISI_DARI_EVALUATOR,
]);

function transitionFor(current: StatusSOP, target: StatusSOP): TransitionRule | undefined {
  return TRANSITIONS[current]?.find((rule) => rule.target === target);
}

export function getSopWorkflowProjection(
  role: PeranPengguna,
  status: StatusSOP,
): SopWorkflowProjection {
  const actions: SopWorkflowAction[] = ['VIEW_HISTORY'];

  if (AUTHORING_ROLES.has(role) && EDITABLE_STATUSES.has(status)) {
    actions.push('EDIT');
  }
  if (transitionFor(status, StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI)?.roles.includes(role) === true) {
    actions.push('SUBMIT_FOR_REVIEW');
  }
  if (transitionFor(status, StatusSOP.DIAJUKAN_EVALUASI)?.roles.includes(role) === true) {
    actions.push('SUBMIT_EVALUATION');
  }
  if (status === StatusSOP.REVISI_DARI_EVALUATOR && role === PeranPengguna.PJ_PENYUSUN) {
    actions.push('RESUBMIT_EVALUATION');
  }
  if (
    status === StatusSOP.DIVERIFIKASI_PJ_EVALUATOR_ORGANISASI &&
    role === PeranPengguna.KEPALA_OPD
  ) {
    actions.push('SIGN');
  }
  if (transitionFor(status, StatusSOP.DICABUT)?.roles.includes(role) === true) {
    actions.push('REVOKE');
  }

  return {
    stage: STAGE_BY_STATUS[status],
    stateLabel: STATE_LABEL_BY_STATUS[status],
    allowedActions: actions,
  };
}

export function assertSopWorkflowActionAllowed(input: SopWorkflowActionInput): void {
  if (getSopWorkflowProjection(input.role, input.status).allowedActions.includes(input.action)) {
    return;
  }
  if (input.action === 'RESUBMIT_EVALUATION') {
    if (input.status !== StatusSOP.REVISI_DARI_EVALUATOR) {
      throw new ConflictException(
        `Hanya SOP berstatus REVISI_DARI_EVALUATOR yang dapat dikirim ulang ke evaluator (status saat ini: ${String(input.status)})`,
      );
    }
    throw new ForbiddenException(
      'Hanya PJ Penyusun yang dapat mengirim ulang ke evaluator setelah revisi',
    );
  }
  if (input.action === 'REVOKE') {
    if (input.status !== StatusSOP.BERLAKU) {
      throw new ConflictException('Hanya SOP berstatus BERLAKU yang dapat dicabut');
    }
    throw new ForbiddenException('Hanya Kepala OPD yang dapat mencabut SOP');
  }
  throw new ForbiddenException('Aksi workflow SOP tidak diizinkan');
}

/** Validasi transisi status DetailSOP per peran; loncat status tidak diizinkan. */
export function assertAllowedSopStatusTransition(input: SopStatusTransitionInput): void {
  const { role, current, target } = input;
  if (current === target) {
    throw new ConflictException('Status SOP sudah sesuai permintaan');
  }
  if (target === StatusSOP.BERLAKU) {
    throw new ConflictException(
      'Pengesahan SOP menjadi BERLAKU wajib melalui endpoint TTE Kepala OPD',
    );
  }

  const rule = transitionFor(current, target);
  if (rule === undefined) {
    throw new ConflictException(
      `Tidak dapat mengubah status dari ${String(current)} ke ${String(target)} melalui endpoint ini`,
    );
  }
  if (!rule.roles.includes(role)) {
    if (target === StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI) {
      throw new ForbiddenException(
        'Hanya penyusun yang dapat menandai SOP menunggu pengajuan evaluasi',
      );
    }
    if (target === StatusSOP.DIAJUKAN_EVALUASI) {
      throw new ForbiddenException('Hanya PJ Penyusun yang dapat mengajukan SOP ke evaluasi');
    }
    if (target === StatusSOP.DICABUT) {
      throw new ForbiddenException('Hanya Kepala OPD yang dapat mencabut SOP');
    }
    throw new ForbiddenException('Peran tidak diizinkan menjalankan transisi SOP ini');
  }
}

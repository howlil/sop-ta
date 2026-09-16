import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  getSopTransition,
  getSopWorkflowActions,
  getSopWorkflowStage,
  type SopWorkflowAction,
} from '../../../common/workflow/sop-workflow.graph';
import { displayStatusSop } from '../../../common/status/status-display';
import { PeranPengguna, StatusSOP } from '../../../generated/prisma';

export type { SopWorkflowAction } from '../../../common/workflow/sop-workflow.graph';

export type SopWorkflowStage =
  | 'AUTHORING'
  | 'PROCESS_REVIEW'
  | 'FINAL_APPROVAL'
  | 'EFFECTIVE'
  | 'SUPERSEDED'
  | 'REVOKED';

export type SopWorkflowState = Readonly<{
  stage: SopWorkflowStage;
  stateLabel: string;
}>;

export type SopWorkflowProjection = SopWorkflowState &
  Readonly<{
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

export function getSopWorkflowState(status: StatusSOP): SopWorkflowState {
  return {
    stage: getSopWorkflowStage(status) as SopWorkflowStage,
    stateLabel: displayStatusSop(status).label,
  };
}

export function getSopWorkflowProjection(
  role: PeranPengguna,
  status: StatusSOP,
): SopWorkflowProjection {
  return {
    ...getSopWorkflowState(status),
    allowedActions: getSopWorkflowActions(role, status),
  };
}

export function assertSopWorkflowActionAllowed(input: SopWorkflowActionInput): void {
  if (getSopWorkflowActions(input.role, input.status).includes(input.action)) {
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

  const edge = getSopTransition(current, target);
  if (edge === undefined) {
    throw new ConflictException(
      `Tidak dapat mengubah status dari ${String(current)} ke ${String(target)} melalui endpoint ini`,
    );
  }
  if (!edge.roles.includes(role)) {
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

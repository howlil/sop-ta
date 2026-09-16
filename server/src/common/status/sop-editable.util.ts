import { ConflictException } from '@nestjs/common';
import {
  getSopWorkflowActions,
  TERMINAL_SOP_STATUSES,
} from '../workflow/sop-workflow.graph';
import { PeranPengguna, StatusSOP } from '../../generated/prisma';

/** Status terminal berasal dari node terminal pada canonical workflow graph. */
export const TERMINAL_DETAIL_STATUSES: ReadonlySet<StatusSOP> = TERMINAL_SOP_STATUSES;

export function isDetailSopEditable(status: StatusSOP): boolean {
  return getSopWorkflowActions(PeranPengguna.PENYUSUN, status).includes('EDIT');
}

export function assertDetailSopEditable(status: StatusSOP): void {
  if (!isDetailSopEditable(status)) {
    throw new ConflictException(
      `DetailSOP berstatus ${String(status)} tidak dapat diubah. Hanya DRAFT, SEDANG_DISUSUN, atau REVISI_DARI_EVALUATOR yang dapat diedit.`,
    );
  }
}

export function hasRevisiInFlight(statuses: StatusSOP[]): boolean {
  return statuses.some((s) => !TERMINAL_DETAIL_STATUSES.has(s));
}

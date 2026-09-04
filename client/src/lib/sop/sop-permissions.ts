import { ROLES } from '@/utils/constants'

export function canPjPenyusunRunCoordinatorActions(role: string): boolean {
  return role === ROLES.PJ_PENYUSUN
}

export function canBuatVersiBaru(row: {
  canBuatVersiBaru?: boolean
}): boolean {
  return row.canBuatVersiBaru === true
}

export function canHapusSopDraftAwal(row: {
  canHapusSopDraft?: boolean
}): boolean {
  return row.canHapusSopDraft === true
}

/**
 * Copy helper untuk menjelaskan kenapa action resubmit tidak tersedia.
 * Permission action sendiri berasal dari `workflow.allowedActions` backend.
 */
export function getKirimUlangRoleBlockingReason(
  role: string | null | undefined,
): string | null {
  if (role === ROLES.PJ_PENYUSUN) {
    return null
  }
  return 'Hanya PJ Penyusun yang dapat mengirim ulang ke evaluator. Hubungi PJ Penyusun OPD Anda.'
}

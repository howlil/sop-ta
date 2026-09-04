import { describe, expect, it } from 'vitest'
import { ROLES } from '@/utils/constants'
import {
  canHapusSopDraftAwal,
  canPjPenyusunRunCoordinatorActions,
  getKirimUlangRoleBlockingReason,
} from '../sop-permissions'

describe('sop-permissions', () => {
  it('should_keep_coordinator_action_as_page_level_role_capability', () => {
    expect(canPjPenyusunRunCoordinatorActions(ROLES.PJ_PENYUSUN)).toBe(true)
    expect(canPjPenyusunRunCoordinatorActions(ROLES.PENYUSUN)).toBe(false)
  })

  it('should_keep_resubmit_role_message_as_copy_only', () => {
    expect(getKirimUlangRoleBlockingReason(ROLES.PJ_PENYUSUN)).toBeNull()
    expect(getKirimUlangRoleBlockingReason(ROLES.PENYUSUN)).toContain('PJ Penyusun')
  })

  it('should_trust_server_capability_for_deleting_initial_sop_draft', () => {
    expect(canHapusSopDraftAwal({ canHapusSopDraft: true })).toBe(true)
    expect(canHapusSopDraftAwal({ canHapusSopDraft: false })).toBe(false)
    expect(canHapusSopDraftAwal({})).toBe(false)
  })
})

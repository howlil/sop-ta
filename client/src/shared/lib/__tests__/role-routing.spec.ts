import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/shared/lib/constants'
import { getRoleDefaultLandingPath } from '@/shared/lib/role-routing'

describe('getRoleDefaultLandingPath', () => {
  it.each([
    ['PJ_EVALUATOR', ROUTES.PJ_EVALUATOR.PEKERJAAN],
    ['EVALUATOR', ROUTES.EVALUATOR.PEKERJAAN],
    ['PENYUSUN', ROUTES.PENYUSUN.PEKERJAAN],
    ['PJ_PENYUSUN', ROUTES.PENYUSUN.PEKERJAAN],
    ['KEPALA_OPD', ROUTES.KEPALA_OPD.PEKERJAAN],
  ])('mengarah %s ke Pekerjaan Saya', (role, expected) => {
    expect(getRoleDefaultLandingPath(role)).toBe(expected)
  })
})

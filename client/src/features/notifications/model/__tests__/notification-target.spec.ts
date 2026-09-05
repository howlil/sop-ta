import { describe, expect, it } from 'vitest'
import { resolveNotificationTarget } from '../notification-target'

describe('resolveNotificationTarget', () => {
  const pengajuanEvaluasiId = 'pengajuan-123'

  it.each([
    ['EVALUASI_SOP', '/evaluator/evaluasi/pengajuan/pengajuan-123'],
    ['TTD_BA_PJ_EVALUATOR', '/pj-evaluator/evaluasi/pengajuan-123'],
    ['TTD_BA_PJ_PENYUSUN', '/penyusun/pj-penyusun/berita-acara/pengajuan-123'],
    ['TTD_SOP_KEPALA_OPD', '/kepala-opd/pengajuan/pengajuan-123'],
  ] as const)('maps %s to its existing workflow route', (jenis, expected) => {
    expect(resolveNotificationTarget({ jenis, pengajuanEvaluasiId })).toBe(expected)
  })

  it('encodes the route identifier before navigation', () => {
    expect(
      resolveNotificationTarget({
        jenis: 'EVALUASI_SOP',
        pengajuanEvaluasiId: 'pengajuan/with space',
      }),
    ).toBe('/evaluator/evaluasi/pengajuan/pengajuan%2Fwith%20space')
  })
})

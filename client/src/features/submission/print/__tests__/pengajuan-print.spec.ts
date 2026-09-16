import { describe, expect, it } from 'vitest'
import {
  canCetakBeritaAcaraPengajuan,
  canCetakSopArsipPengajuan,
} from '../pengajuan-print'

describe('canCetakBeritaAcaraPengajuan', () => {
  it('mengizinkan cetak BA setelah kedua PJ menandatangani', () => {
    expect(canCetakBeritaAcaraPengajuan('DITANDATANGANI_PJ_PENYUSUN')).toBe(true)
    expect(canCetakBeritaAcaraPengajuan('SELESAI')).toBe(true)
    expect(canCetakBeritaAcaraPengajuan('DITANDATANGANI_PJ_EVALUATOR')).toBe(false)
    expect(canCetakBeritaAcaraPengajuan(undefined)).toBe(false)
  })
})

describe('canCetakSopArsipPengajuan', () => {
  it('mengizinkan cetak SOP arsip hanya saat status SELESAI', () => {
    expect(canCetakSopArsipPengajuan('SELESAI')).toBe(true)
    expect(canCetakSopArsipPengajuan('DITANDATANGANI_PJ_PENYUSUN')).toBe(false)
    expect(canCetakSopArsipPengajuan(undefined)).toBe(false)
  })
})

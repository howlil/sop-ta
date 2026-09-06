import { describe, expect, it } from 'vitest'
import { buildSopProsedurSnapshot } from '@/pages/penyusun/sop/hooks/use-sop-prosedur-autosave'
import type { ProsedurRow } from '@/types/ui/sop'

describe('buildSopProsedurSnapshot', () => {
  it('maps canonical editor fields directly to the API procedure snapshot', () => {
    const row: ProsedurRow = {
      id: 'step-1',
      urutan: 1,
      kegiatan: 'Kegiatan A',
      pelaksana: 'pel-1',
      kelengkapan: 'Kelengkapan A',
      waktu: 15,
      satuanWaktu: 'm',
      keluaran: 'Output A',
      keterangan: 'catatan',
      type: 'task',
    }
    const snapshot = buildSopProsedurSnapshot([{ id: 'pel-1', name: 'Pelaksana' }], [row])

    expect(snapshot.langkah).toHaveLength(1)
    expect(snapshot.langkah[0]).toMatchObject({
      tempId: 'step-1',
      jenis: 'KEGIATAN',
      kegiatan: 'Kegiatan A',
      pelaksanaId: 'pel-1',
      kelengkapan: 'Kelengkapan A',
      waktu: 15,
      satuanWaktu: 'm',
      keluaran: 'Output A',
      keterangan: 'catatan',
    })
  })
})

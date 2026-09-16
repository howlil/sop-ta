/** Target aksi arsip pengajuan: unduh BA (PDF) atau cetak SOP (PDF). */
export type PengajuanPrintTarget = 'ba' | 'sop'

export const CETAK_ARSIP_DISABLED_TITLE =
  'Tersedia setelah seluruh SOP ditandatangani Kepala OPD (status pengajuan selesai).'

export const CETAK_BA_DISABLED_TITLE =
  'Tersedia setelah Berita Acara ditandatangani PJ Evaluator dan PJ Penyusun.'

/** Unduh Berita Acara arsip — setelah kedua PJ menandatangani BA. */
export function canCetakBeritaAcaraPengajuan(status: string | undefined): boolean {
  return status === 'DITANDATANGANI_PJ_PENYUSUN' || status === 'SELESAI'
}

/** Cetak SOP arsip pengajuan — hanya setelah pengajuan SELESAI (semua SOP Berlaku). */
export function canCetakSopArsipPengajuan(status: string | undefined): boolean {
  return status === 'SELESAI'
}

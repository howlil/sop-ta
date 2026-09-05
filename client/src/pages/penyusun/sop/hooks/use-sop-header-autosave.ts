import {
  useSingleWriterAutosave,
  type SingleWriterAutosaveStatus,
} from '@/shared/hooks/use-single-writer-autosave'
import type { UpdateSopHeaderDto } from '@/types/dto/sop.dto'
import type { SOPDetailMetadata } from '@/types/ui/sop'

const DEFAULT_DEBOUNCE_MS = 800
const SAVED_INDICATOR_MS = 1500

/**
 * Snapshot ringkas metadata header yang dilacak autosave. Menjaga kontrak diff
 * agar tidak mengirim PATCH untuk perubahan yang tidak relevan dengan header SOP.
 */
export interface SopHeaderSnapshot {
  judul: string
  nomorSOP: string
  namaLembaga: string
  peringatan: string[]
  dasarHukumPeraturanIds: string[]
  sopTerkaitDetailIds: string[]
  kualifikasiPelaksanaan: string[]
  peralatanPerlengkapan: string[]
  pencatatanPendataan: string[]
}

function asArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((v) => v.trim()).filter((v) => v.length > 0)
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()]
  return []
}

/**
 * Pisahkan `metadata` UI menjadi snapshot ringkas yang akan dibandingkan untuk diff.
 * Multi-baris `lembaga` digabung dari `institutionLines` jika tersedia.
 */
export function buildSopHeaderSnapshot(metadata: SOPDetailMetadata): SopHeaderSnapshot {
  const lembagaFromLines = (metadata.institutionLines ?? [])
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
  const lembaga =
    lembagaFromLines.length > 0 ? lembagaFromLines : (metadata.lembaga ?? '').trim()
  return {
    judul: (metadata.judul ?? metadata.nama ?? '').trim(),
    nomorSOP: (metadata.nomorSOP ?? metadata.nomor ?? '').trim(),
    namaLembaga: lembaga,
    peringatan: asArray(metadata.warning),
    dasarHukumPeraturanIds: [...(metadata.lawBasisIds ?? [])],
    sopTerkaitDetailIds: [...(metadata.relatedSopDetailIds ?? [])],
    kualifikasiPelaksanaan: asArray(metadata.implementQualification),
    peralatanPerlengkapan: asArray(metadata.equipment),
    pencatatanPendataan: asArray(metadata.recordData),
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Hitung diff antara snapshot terbaru dengan baseline tersimpan.
 * Field yang tidak berubah tidak dimasukkan ke payload sehingga PATCH minimal.
 */
export function diffSopHeaderSnapshots(
  current: SopHeaderSnapshot,
  baseline: SopHeaderSnapshot,
): UpdateSopHeaderDto {
  const dto: UpdateSopHeaderDto = {}
  if (current.judul !== baseline.judul) dto.judul = current.judul
  if (current.nomorSOP !== baseline.nomorSOP) dto.nomorSOP = current.nomorSOP
  if (current.namaLembaga !== baseline.namaLembaga) dto.namaLembaga = current.namaLembaga
  if (!arraysEqual(current.peringatan, baseline.peringatan)) {
    dto.lampiran = { ...(dto.lampiran ?? {}), peringatan: current.peringatan }
  }
  if (!arraysEqual(current.dasarHukumPeraturanIds, baseline.dasarHukumPeraturanIds)) {
    dto.dasarHukumPeraturanIds = current.dasarHukumPeraturanIds
  }
  if (!arraysEqual(current.sopTerkaitDetailIds, baseline.sopTerkaitDetailIds)) {
    dto.sopTerkaitDetailIds = current.sopTerkaitDetailIds
  }
  if (!arraysEqual(current.kualifikasiPelaksanaan, baseline.kualifikasiPelaksanaan)) {
    dto.lampiran = { ...(dto.lampiran ?? {}), kualifikasiPelaksanaan: current.kualifikasiPelaksanaan }
  }
  if (!arraysEqual(current.peralatanPerlengkapan, baseline.peralatanPerlengkapan)) {
    dto.lampiran = { ...(dto.lampiran ?? {}), peralatanPerlengkapan: current.peralatanPerlengkapan }
  }
  if (!arraysEqual(current.pencatatanPendataan, baseline.pencatatanPendataan)) {
    dto.lampiran = { ...(dto.lampiran ?? {}), pencatatanPendataan: current.pencatatanPendataan }
  }
  return dto
}

function buildPatch(
  current: SopHeaderSnapshot,
  baseline: SopHeaderSnapshot,
): UpdateSopHeaderDto | null {
  const diff = diffSopHeaderSnapshots(current, baseline)
  return Object.keys(diff).length > 0 ? diff : null
}

/** Status autosave yang dapat ditampilkan ke user. */
export type SopHeaderAutosaveStatus = SingleWriterAutosaveStatus

export interface UseSopHeaderAutosaveOptions {
  /** ID DetailSOP atau header SOP — autosave dimatikan jika kosong / `enabled=false`. */
  detailSopId: string | undefined
  /** Snapshot metadata terbaru hasil `buildSopHeaderSnapshot`. */
  snapshot: SopHeaderSnapshot
  /** Mutator untuk menyimpan perubahan; harus mengembalikan promise (mis. `mutateAsync`). */
  save: (payload: UpdateSopHeaderDto) => Promise<unknown>
  /** Boleh dimatikan saat data awal belum siap. Default `true`. */
  enabled?: boolean
  /** Override durasi debounce, default 800ms. */
  debounceMs?: number
}

export interface SopHeaderAutosaveControls {
  /** Paksa kirim diff sekarang (tanpa menunggu debounce); aman dipanggil sebelum aksi besar. */
  flush: () => Promise<void>
  /** Setel ulang baseline tanpa kirim PATCH (mis. setelah workbench dimuat ulang dari server). */
  resetBaseline: (next: SopHeaderSnapshot) => void
  /** Status autosave saat ini (untuk indikator UI). */
  status: SopHeaderAutosaveStatus
  /** Error terakhir (jika `status === 'error'`). */
  lastError: Error | null
}

/**
 * Autosave header SOP memakai scheduler single-writer bersama prosedur SOP.
 * Snapshot dan diff header tetap domain-specific; scheduler hanya mengatur debounce,
 * serialization, coalescing perubahan terbaru, flush, dan status.
 */
export function useSopHeaderAutosave(
  options: UseSopHeaderAutosaveOptions,
): SopHeaderAutosaveControls {
  const { detailSopId, snapshot, save, enabled = true, debounceMs = DEFAULT_DEBOUNCE_MS } = options

  return useSingleWriterAutosave({
    snapshot,
    buildPatch,
    save,
    enabled: enabled && Boolean(detailSopId),
    debounceMs,
    savedIndicatorMs: SAVED_INDICATOR_MS,
  })
}

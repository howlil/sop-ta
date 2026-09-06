import {
  useSingleWriterAutosave,
  type SingleWriterAutosaveStatus,
} from '@/shared/hooks/use-single-writer-autosave'
import type { UpdateSopHeaderDto } from '@/types/dto/sop.dto'
import type { SOPDetailMetadata } from '@/types/ui/sop'

const DEFAULT_DEBOUNCE_MS = 800
const SAVED_INDICATOR_MS = 1500

/** Snapshot ringkas metadata header yang dilacak autosave. */
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

function normalizedList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)
}

/** Adapter editor state -> autosave snapshot. Tidak ada compatibility fallback di editor layer. */
export function buildSopHeaderSnapshot(metadata: SOPDetailMetadata): SopHeaderSnapshot {
  return {
    judul: (metadata.judul ?? '').trim(),
    nomorSOP: (metadata.nomorSOP ?? '').trim(),
    namaLembaga: (metadata.namaLembaga ?? '').trim(),
    peringatan: normalizedList(metadata.peringatan),
    dasarHukumPeraturanIds: [...(metadata.dasarHukumPeraturanIds ?? [])],
    sopTerkaitDetailIds: [...(metadata.sopTerkaitDetailIds ?? [])],
    kualifikasiPelaksanaan: normalizedList(metadata.kualifikasiPelaksanaan),
    peralatanPerlengkapan: normalizedList(metadata.peralatanPerlengkapan),
    pencatatanPendataan: normalizedList(metadata.pencatatanPendataan),
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/** Hitung PATCH minimal antara snapshot terbaru dengan baseline tersimpan. */
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

export type SopHeaderAutosaveStatus = SingleWriterAutosaveStatus

export interface UseSopHeaderAutosaveOptions {
  detailSopId: string | undefined
  snapshot: SopHeaderSnapshot
  save: (payload: UpdateSopHeaderDto) => Promise<unknown>
  enabled?: boolean
  debounceMs?: number
}

export interface SopHeaderAutosaveControls {
  flush: () => Promise<void>
  resetBaseline: (next: SopHeaderSnapshot) => void
  status: SopHeaderAutosaveStatus
  lastError: Error | null
}

/**
 * Autosave header SOP memakai scheduler single-writer bersama prosedur SOP.
 * Snapshot/diff tetap domain-specific; scheduler hanya mengatur concurrency lifecycle.
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

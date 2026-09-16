import {
  useSingleWriterAutosave,
  type SingleWriterAutosaveStatus,
} from '@/shared/hooks/use-single-writer-autosave'
import type {
  JenisLangkahProsedur,
  LangkahPatchItem,
  PelaksanaPatchItem,
  SatuanWaktu,
  UpdateSopProsedurDto,
} from '@/types/dto/sop.dto'
import type { ProsedurRow, SopEditorImplementer } from '@/types/ui/sop'
import { resolveProsedurPelaksanaId } from '@/lib/sop/resolve-prosedur-implementer'

const DEFAULT_DEBOUNCE_MS = 800
const SAVED_INDICATOR_MS = 1500

const ROW_TYPE_TO_JENIS: Record<NonNullable<ProsedurRow['type']>, JenisLangkahProsedur> = {
  task: 'KEGIATAN',
  decision: 'KEPUTUSAN',
  terminator: 'AWAL_AKHIR',
}

const SATUAN_WAKTU = new Set<SatuanWaktu>(['m', 'h', 'd', 'w', 'mo', 'y'])

function normalizeSatuan(input: string | undefined): SatuanWaktu | undefined {
  if (!input || !SATUAN_WAKTU.has(input as SatuanWaktu)) return undefined
  return input as SatuanWaktu
}

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = (value ?? '').trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Snapshot stabil dari canonical editor state untuk diff & PATCH. */
export interface SopProsedurSnapshot {
  pelaksana: PelaksanaPatchItem[]
  langkah: LangkahPatchItem[]
}

export function buildSopProsedurSnapshot(
  implementers: SopEditorImplementer[],
  rows: ProsedurRow[],
): SopProsedurSnapshot {
  const pelaksana: PelaksanaPatchItem[] = implementers
    .filter((item) => item.id.length > 0)
    .map((item) => ({ pelaksanaId: item.id }))

  const langkah: LangkahPatchItem[] = rows
    .map((row) => mapRowToLangkah(row))
    .filter((item): item is LangkahPatchItem => item !== null)

  return { pelaksana, langkah }
}

/** Adapter boundary: canonical procedure row -> API patch item. */
function mapRowToLangkah(row: ProsedurRow): LangkahPatchItem | null {
  const kegiatan = row.kegiatan.trim()
  const pelaksanaId = resolveProsedurPelaksanaId(row)
  if (kegiatan.length === 0 && pelaksanaId.length === 0) return null

  const jenis: JenisLangkahProsedur = row.type
    ? (ROW_TYPE_TO_JENIS[row.type] ?? 'KEGIATAN')
    : 'KEGIATAN'
  const isKeputusan = jenis === 'KEPUTUSAN'
  const waktu =
    typeof row.waktu === 'number' && Number.isFinite(row.waktu)
      ? Math.max(0, row.waktu)
      : undefined

  return {
    tempId: row.id,
    jenis,
    kegiatan,
    kelengkapan: trimmedOrUndefined(row.kelengkapan),
    keluaran: trimmedOrUndefined(row.keluaran),
    waktu,
    satuanWaktu: waktu !== undefined ? normalizeSatuan(row.satuanWaktu) : undefined,
    keterangan: trimmedOrUndefined(row.keterangan),
    pelaksanaId: pelaksanaId.length > 0 ? pelaksanaId : undefined,
    langkahSelanjutnyaYaTempId: isKeputusan
      ? (row.id_next_step_if_yes ?? null) || null
      : null,
    langkahSelanjutnyaTidakTempId: isKeputusan
      ? (row.id_next_step_if_no ?? null) || null
      : null,
  }
}

function pelaksanaListEqual(a: PelaksanaPatchItem[], b: PelaksanaPatchItem[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].pelaksanaId !== b[i].pelaksanaId) return false
  }
  return true
}

function langkahItemEqual(a: LangkahPatchItem, b: LangkahPatchItem): boolean {
  return (
    a.tempId === b.tempId &&
    a.jenis === b.jenis &&
    a.kegiatan === b.kegiatan &&
    (a.kelengkapan ?? '') === (b.kelengkapan ?? '') &&
    (a.keluaran ?? '') === (b.keluaran ?? '') &&
    (a.waktu ?? null) === (b.waktu ?? null) &&
    (a.satuanWaktu ?? null) === (b.satuanWaktu ?? null) &&
    (a.keterangan ?? '') === (b.keterangan ?? '') &&
    (a.pelaksanaId ?? null) === (b.pelaksanaId ?? null) &&
    (a.langkahSelanjutnyaYaTempId ?? null) === (b.langkahSelanjutnyaYaTempId ?? null) &&
    (a.langkahSelanjutnyaTidakTempId ?? null) === (b.langkahSelanjutnyaTidakTempId ?? null)
  )
}

function langkahListEqual(a: LangkahPatchItem[], b: LangkahPatchItem[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (!langkahItemEqual(a[i], b[i])) return false
  }
  return true
}

export function diffSopProsedurSnapshots(
  current: SopProsedurSnapshot,
  baseline: SopProsedurSnapshot,
): UpdateSopProsedurDto {
  const dto: UpdateSopProsedurDto = {}
  if (!pelaksanaListEqual(current.pelaksana, baseline.pelaksana)) {
    dto.pelaksana = current.pelaksana
  }
  if (!langkahListEqual(current.langkah, baseline.langkah)) {
    dto.langkah = current.langkah
  }
  return dto
}

function buildPatch(
  current: SopProsedurSnapshot,
  baseline: SopProsedurSnapshot,
): UpdateSopProsedurDto | null {
  const diff = diffSopProsedurSnapshots(current, baseline)
  return diff.pelaksana !== undefined || diff.langkah !== undefined ? diff : null
}

export type SopProsedurAutosaveStatus = SingleWriterAutosaveStatus

export interface UseSopProsedurAutosaveOptions {
  detailSopId: string | undefined
  snapshot: SopProsedurSnapshot
  save: (payload: UpdateSopProsedurDto) => Promise<unknown>
  enabled?: boolean
  debounceMs?: number
}

export interface SopProsedurAutosaveControls {
  flush: () => Promise<void>
  resetBaseline: (next: SopProsedurSnapshot) => void
  status: SopProsedurAutosaveStatus
  lastError: Error | null
}

/**
 * Autosave prosedur SOP memakai scheduler single-writer yang sama dengan header.
 * Mapping canonical editor -> API dan diff replace-all tetap domain-specific.
 */
export function useSopProsedurAutosave(
  options: UseSopProsedurAutosaveOptions,
): SopProsedurAutosaveControls {
  const {
    detailSopId,
    snapshot,
    save,
    enabled = true,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options

  return useSingleWriterAutosave({
    snapshot,
    buildPatch,
    save,
    enabled: enabled && Boolean(detailSopId),
    debounceMs,
    savedIndicatorMs: SAVED_INDICATOR_MS,
  })
}

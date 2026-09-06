/** Domain row tetap canonical; diagram mendapat projection khusus untuk compatibility renderer. */
export type { ProsedurRow as ProsedurStepType } from '@/types/ui/sop'

import type { ProsedurRow as CanonicalProsedurRow } from '@/types/ui/sop'
import { resolveProsedurPelaksanaIdOrFallback } from '@/lib/sop/resolve-prosedur-implementer'

/**
 * Shape khusus renderer flowchart lama. Alias presentation ini tidak menjadi editor state;
 * `toDiagramProsedurRows` adalah satu-satunya boundary yang membentuknya.
 */
export interface ProsedurRow extends CanonicalProsedurRow {
  no: number
  mutu_kelengkapan?: string
  time?: number
  time_unit?: string
  mutu_waktu?: string
  output?: string
}

export function toDiagramProsedurRows(rows: CanonicalProsedurRow[]): ProsedurRow[] {
  return rows.map((row) => ({
    ...row,
    no: row.urutan,
    mutu_kelengkapan: row.kelengkapan,
    time: row.waktu,
    time_unit: row.satuanWaktu,
    mutu_waktu:
      row.waktu === undefined
        ? undefined
        : row.waktu === 0
          ? ''
          : `${row.waktu} ${getFullTimeUnit(row.satuanWaktu ?? 'm')}`,
    output: row.keluaran,
  }))
}

export interface LayoutConfig {
  widthKegiatan?: number
  widthKelengkapan?: number
  widthWaktu?: number
  widthOutput?: number
  widthKeterangan?: number
  firstPageSteps?: number
  nextPageSteps?: number
}

export interface Implementer {
  id: string
  name: string
}

export interface SOPStep {
  seq_number: number
  name: string
  type: string
  id_implementer?: string
  /** Step id for BPMN (e.g. row id or 'start-terminator' / 'end-terminator') */
  id_step?: string
  /** Row id for next step when decision answer is Yes */
  id_next_step_if_yes?: string
  /** Row id for next step when decision answer is No */
  id_next_step_if_no?: string
}

/** Single point for arrow path (start, end, or bend) */
export interface ArrowPathPoint {
  x: number
  y: number
}

/** Persisted arrow path config per connection (source of truth when present) */
export interface ArrowConnectionConfig {
  sSide: 'top' | 'bottom' | 'left' | 'right'
  eSide: 'top' | 'bottom' | 'left' | 'right'
  startPoint: ArrowPathPoint
  endPoint: ArrowPathPoint
  bendPoints: ArrowPathPoint[]
}

/** Map connectionId → persisted path config per connection. */
export type ArrowConfig = Record<string, ArrowConnectionConfig>

/** Connection descriptor for flowchart arrows (logic + UI). */
export interface FlowchartConnection {
  id: string
  from: string
  to: string
  label?: string | null
  sourceType?: string
  targetType?: string
  fromImplementerId?: string
  toImplementerId?: string
}

export interface LabelPosition {
  x: number
  y: number
}

export type CustomLabels = Record<string, string>
export type LabelPositions = Record<string, LabelPosition>

export interface LabelConfig {
  custom_labels?: CustomLabels
  positions?: LabelPositions
}

export function isYaLabel(lbl: string | null | undefined): boolean {
  return /^(ya|yes|y)$/.test((lbl ?? '').trim().toLowerCase())
}

export function isTidakLabel(lbl: string | null | undefined): boolean {
  return /^(tidak|no|n)$/.test((lbl ?? '').trim().toLowerCase())
}

export function getFullTimeUnit(unit: string): string {
  const map: Record<string, string> = {
    h: 'Jam',
    m: 'Menit',
    d: 'Hari',
    w: 'Minggu',
    mo: 'Bulan',
    y: 'Tahun',
  }
  return map[unit] ?? unit
}

/** Konversi canonical procedure rows + implementers → SOPStep[] untuk diagram Flowchart/BPMN. */
export function rowsToSteps(
  rows: CanonicalProsedurRow[],
  implementers: Implementer[]
): SOPStep[] {
  return rows.map((row) => {
    const implementerId = resolveProsedurPelaksanaIdOrFallback(row, implementers[0]?.id)
    const type =
      row.type ??
      (row.urutan === 1 || row.urutan === rows.length ? 'terminator' : 'task')
    return {
      seq_number: row.urutan,
      name: row.kegiatan,
      type,
      id_implementer: implementerId || implementers[0]?.id,
      id_step: row.id,
      id_next_step_if_yes: row.id_next_step_if_yes,
      id_next_step_if_no: row.id_next_step_if_no,
    }
  })
}

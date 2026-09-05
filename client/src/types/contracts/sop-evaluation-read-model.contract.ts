import type { PenyusunWorkbenchData } from '@/types/dto/sop.dto'
import type { TTESignaturePayload } from '@/types/dto/tte.dto'

/**
 * Read-model lintas SOP ↔ Evaluation.
 *
 * Ownership netral: Evaluation boleh mengonsumsi dokumen SOP tanpa membuat
 * `evaluasi.dto.ts` bergantung langsung pada `sop.dto.ts`.
 */
export interface PengajuanSopWorkbenchResponse {
  detailSopId: string
  workbench: PenyusunWorkbenchData
  /** Payload QR TTE Kepala OPD bila SOP sudah ditandatangani. */
  tteSignaturePayloadKepalaOpd?: TTESignaturePayload
}

/** Preview SOP di workspace evaluator; payload workbench tetap identik. */
export interface EvaluasiWorkspacePreview {
  detailSopId: string
  workbench: PenyusunWorkbenchData
}

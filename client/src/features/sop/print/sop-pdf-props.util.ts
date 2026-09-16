import type {
  SopPdfDocumentProps,
  SopPdfPrintMode,
} from '@/features/sop/ui/sop-pdf-document'
import type { TTESignaturePayload } from '@/types/dto/tte.dto'

export interface SopPrintPreview {
  name?: string
  number?: string
  metadata?: SopPdfDocumentProps['metadata']
  prosedurRows: NonNullable<SopPdfDocumentProps['prosedurRows']>
  implementers: NonNullable<SopPdfDocumentProps['implementers']>
  diagramKonfigurasi?: SopPdfDocumentProps['diagramKonfigurasi']
}

export interface SopPdfPropsFromPreviewOptions {
  includeHeader?: boolean
  printMode?: SopPdfPrintMode
  tteSignaturePayload?: TTESignaturePayload | null
}

/** Memetakan data preview SOP ke dokumen PDF tanpa bergantung pada feature lain. */
export function sopPreviewPropsToPdfDocumentProps(
  preview: SopPrintPreview,
  options: SopPdfPropsFromPreviewOptions = {},
): SopPdfDocumentProps {
  const printMode = options.printMode ?? 'diagrams_only'
  const includeHeader =
    options.includeHeader ??
    (printMode === 'full' ||
      printMode === 'steps_and_diagrams' ||
      printMode === 'header_and_steps' ||
      printMode === 'header_steps_bpmn')
  return {
    name: preview.name,
    number: preview.number,
    metadata: preview.metadata,
    prosedurRows: preview.prosedurRows,
    implementers: preview.implementers,
    tteSignaturePayload: options.tteSignaturePayload ?? null,
    includeHeader,
    printMode,
    diagramKonfigurasi: preview.diagramKonfigurasi,
  }
}

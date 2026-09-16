/**
 * Temporary type-only compatibility path for the SOP PDF renderer.
 * Runtime diagram export now belongs to `features/sop/print`.
 * Remove this shell when the remaining UI compatibility imports are migrated.
 */
export interface DiagramPageSnapshot {
  kind: 'flowchart' | 'bpmn'
  pageIndex: number
  dataUrl: string
  width: number
  height: number
}

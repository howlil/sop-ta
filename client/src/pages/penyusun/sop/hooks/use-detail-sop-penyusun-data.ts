import { useEffect, useMemo, useRef, useState } from 'react'
import { usePeraturan } from '@/api/peraturan'
import { usePenyusunWorkbench, useSop } from '@/api/sop-queries'
import {
  usePelaksana,
  useSopStatus,
  useUpdateSopHeader,
  useUpdateSopProsedur,
} from '@/api/sop-mutations'
import {
  buildSopHeaderSnapshot,
  useSopHeaderAutosave,
  type SopHeaderAutosaveStatus,
} from '@/pages/penyusun/sop/hooks/use-sop-header-autosave'
import {
  buildSopProsedurSnapshot,
  useSopProsedurAutosave,
  type SopProsedurAutosaveStatus,
} from '@/pages/penyusun/sop/hooks/use-sop-prosedur-autosave'
import {
  transformLangkahToProsedurRow,
  transformSopDetailToMetadata,
} from '@/lib/sop/detailSop.mappers'
import { hasSopWorkflowAction } from '@/lib/sop/sop-workflow'
import { DEFAULT_SOP_STATUS } from '@/types/dto/sop.dto'
import type { Peraturan } from '@/types/dto/peraturan.dto'
import type { PenyusunWorkbenchLogEdit, StatusSOP } from '@/types/dto/sop.dto'
import type {
  ProsedurRow,
  SOPDetailMetadata,
  SopEditorImplementer,
} from '@/types/ui/sop'

export interface UseDetailSopPenyusunDataResult {
  metadata: SOPDetailMetadata
  setMetadata: React.Dispatch<React.SetStateAction<SOPDetailMetadata>>
  prosedurRows: ProsedurRow[]
  setProsedurRows: React.Dispatch<React.SetStateAction<ProsedurRow[]>>
  implementers: SopEditorImplementer[]
  setImplementers: React.Dispatch<React.SetStateAction<SopEditorImplementer[]>>
  auditLogs: PenyusunWorkbenchLogEdit[]
  activeTab: 'flowchart' | 'bpmn'
  setActiveTab: React.Dispatch<React.SetStateAction<'flowchart' | 'bpmn'>>
  isEditingSteps: boolean
  setIsEditingSteps: React.Dispatch<React.SetStateAction<boolean>>
  isEditPanelCollapsed: boolean
  setIsEditPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  rightPanelTab: 'edit' | 'komentar' | 'versi' | 'aktivitas'
  setRightPanelTab: React.Dispatch<
    React.SetStateAction<'edit' | 'komentar' | 'versi' | 'aktivitas'>
  >
  isLoading: boolean
  masterPelaksanaOptions: { id: string; name: string }[]
  relatedPosOptions: string[]
  /** Opsi keterkaitan SOP id-aware (id = detailSopId terbaru per SOP). */
  relatedSopOptions: { id: string; label: string }[]
  peraturanList: Peraturan[]
  currentSopStatus: StatusSOP
  currentSopStatusLabel: string
  isRevisionFlow: boolean
  primaryActionLabel: string
  canKirimUlangKeEvaluator: boolean
  setSopStatusOverrideAsync: ReturnType<typeof useSopStatus>['setSopStatusOverrideAsync']
  flushHeaderAutosave: () => Promise<void>
  flushProsedurAutosave: () => Promise<void>
  autosaveStatus: SopHeaderAutosaveStatus
  autosaveError: Error | null
  prosedurAutosaveStatus: SopProsedurAutosaveStatus
  prosedurAutosaveError: Error | null
  canEditDetail: boolean
}

/**
 * Data/state controller editor SOP. Ia mengikat server workbench ke state editor lokal
 * dan autosave, tetapi tidak menjalankan workflow action tingkat halaman.
 */
export function useDetailSopPenyusunData(
  sopDetailId: string | undefined,
  sopStatusOverride: StatusSOP | undefined,
  _role: string | null | undefined,
): UseDetailSopPenyusunDataResult {
  const { setSopStatusOverrideAsync } = useSopStatus()
  const { list: sopList } = useSop()
  const { list: peraturanList } = usePeraturan()
  const { list: pelaksanaList } = usePelaksana()
  const { data: workbench, isLoading: isLoadingWorkbench } = usePenyusunWorkbench(sopDetailId)
  const updateSopHeaderMutation = useUpdateSopHeader(sopDetailId ?? '')
  const updateSopProsedurMutation = useUpdateSopProsedur(sopDetailId ?? '')

  const [metadata, setMetadata] = useState<SOPDetailMetadata>({})
  const [prosedurRows, setProsedurRows] = useState<ProsedurRow[]>([])
  const [implementers, setImplementers] = useState<SopEditorImplementer[]>([])
  const [activeTab, setActiveTab] = useState<'flowchart' | 'bpmn'>('flowchart')
  const [isEditingSteps, setIsEditingSteps] = useState(false)
  const [isEditPanelCollapsed, setIsEditPanelCollapsed] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState<
    'edit' | 'komentar' | 'versi' | 'aktivitas'
  >('edit')

  const sopDetail = workbench?.detail
  const langkahList = useMemo(() => workbench?.langkah ?? [], [workbench?.langkah])
  const auditLogs = workbench?.logEdit ?? []
  const resolvedStatusForEdit = useMemo(
    (): StatusSOP =>
      (workbench?.detail.status ?? sopStatusOverride ?? DEFAULT_SOP_STATUS) as StatusSOP,
    [workbench?.detail.status, sopStatusOverride],
  )
  const canEditDetail = hasSopWorkflowAction(workbench, 'EDIT')
  const lastSyncedDetailIdRef = useRef<string | null>(null)

  const headerSnapshot = useMemo(() => buildSopHeaderSnapshot(metadata), [metadata])
  const headerAutosave = useSopHeaderAutosave({
    detailSopId: sopDetailId,
    snapshot: headerSnapshot,
    save: updateSopHeaderMutation.mutateAsync,
    enabled: Boolean(sopDetailId) && Boolean(sopDetail) && canEditDetail,
  })

  const prosedurSnapshot = useMemo(
    () => buildSopProsedurSnapshot(implementers, prosedurRows),
    [implementers, prosedurRows],
  )
  const prosedurAutosave = useSopProsedurAutosave({
    detailSopId: sopDetailId,
    snapshot: prosedurSnapshot,
    save: updateSopProsedurMutation.mutateAsync,
    enabled: Boolean(sopDetailId) && Boolean(sopDetail) && canEditDetail,
  })

  const resetHeaderBaselineRef = useRef(headerAutosave.resetBaseline)
  resetHeaderBaselineRef.current = headerAutosave.resetBaseline
  const resetProsedurBaselineRef = useRef(prosedurAutosave.resetBaseline)
  resetProsedurBaselineRef.current = prosedurAutosave.resetBaseline

  useEffect(() => {
    if (!sopDetail) return
    if (lastSyncedDetailIdRef.current === sopDetail.id) return

    lastSyncedDetailIdRef.current = sopDetail.id
    const nextMetadata = transformSopDetailToMetadata(sopDetail)
    setMetadata(nextMetadata)
    resetHeaderBaselineRef.current(buildSopHeaderSnapshot(nextMetadata))

    let nextRows: ProsedurRow[] = []
    if (langkahList.length > 0) {
      nextRows = [...langkahList]
        .sort((a, b) => a.urutan - b.urutan)
        .map(transformLangkahToProsedurRow)
    }

    const nextImplementers: SopEditorImplementer[] = []
    const seenImplementerIds = new Set<string>()
    const swimlanes = sopDetail.swimlanes ?? []
    for (const sw of [...swimlanes].sort((a, b) => a.urutan - b.urutan)) {
      if (!sw.pelaksanaId || seenImplementerIds.has(sw.pelaksanaId)) continue
      seenImplementerIds.add(sw.pelaksanaId)
      const name =
        sw.pelaksana?.namaPelaksana ??
        pelaksanaList.find((p) => p.id === sw.pelaksanaId)?.namaPelaksana ??
        sw.pelaksanaId
      nextImplementers.push({ id: sw.pelaksanaId, name })
    }
    for (const row of nextRows) {
      if (!row.pelaksana || seenImplementerIds.has(row.pelaksana)) continue
      seenImplementerIds.add(row.pelaksana)
      const name =
        pelaksanaList.find((p) => p.id === row.pelaksana)?.namaPelaksana ?? row.pelaksana
      nextImplementers.push({ id: row.pelaksana, name })
    }

    setProsedurRows(nextRows)
    setImplementers(nextImplementers)
    resetProsedurBaselineRef.current(buildSopProsedurSnapshot(nextImplementers, nextRows))
  }, [sopDetail, langkahList, pelaksanaList])

  const masterPelaksanaOptions = useMemo(
    () =>
      pelaksanaList.map((pelaksana) => ({
        id: pelaksana.id,
        name: pelaksana.namaPelaksana,
      })),
    [pelaksanaList],
  )
  const relatedPosOptions = useMemo(
    () => sopList.map((sop) => sop.judul).filter(Boolean),
    [sopList],
  )
  const relatedSopOptions = useMemo(
    () =>
      sopList
        .filter((sop) => Boolean(sop.detailSopId) && sop.id !== sopDetail?.sopId)
        .map((sop) => ({
          id: sop.detailSopId as string,
          label: sop.judul,
        })),
    [sopList, sopDetail?.sopId],
  )

  const currentSopStatus: StatusSOP = resolvedStatusForEdit
  const currentSopStatusLabel = workbench?.detail.statusLabel ?? currentSopStatus
  const isRevisionFlow = currentSopStatus === 'REVISI_DARI_EVALUATOR'
  const canKirimUlangKeEvaluator = hasSopWorkflowAction(workbench, 'RESUBMIT_EVALUATION')
  const primaryActionLabel =
    isRevisionFlow && canKirimUlangKeEvaluator ? 'Kirim ulang evaluasi' : 'Selesai'

  return {
    metadata,
    setMetadata,
    prosedurRows,
    setProsedurRows,
    implementers,
    setImplementers,
    auditLogs,
    activeTab,
    setActiveTab,
    isEditingSteps,
    setIsEditingSteps,
    isEditPanelCollapsed,
    setIsEditPanelCollapsed,
    rightPanelTab,
    setRightPanelTab,
    isLoading: isLoadingWorkbench,
    masterPelaksanaOptions,
    relatedPosOptions,
    relatedSopOptions,
    peraturanList,
    currentSopStatus,
    currentSopStatusLabel,
    isRevisionFlow,
    primaryActionLabel,
    canKirimUlangKeEvaluator,
    setSopStatusOverrideAsync,
    flushHeaderAutosave: headerAutosave.flush,
    flushProsedurAutosave: prosedurAutosave.flush,
    autosaveStatus: headerAutosave.status,
    autosaveError: headerAutosave.lastError,
    prosedurAutosaveStatus: prosedurAutosave.status,
    prosedurAutosaveError: prosedurAutosave.lastError,
    canEditDetail,
  }
}

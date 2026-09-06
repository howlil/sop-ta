import { useCallback } from 'react'
import type { NavigateOptions } from '@tanstack/react-router'
import { useAppRole } from '@/hooks/useAppRole'
import { useToast } from '@/hooks/useToast'
import type { SopHeaderAutosaveStatus } from '@/pages/penyusun/sop/hooks/use-sop-header-autosave'
import type { SopProsedurAutosaveStatus } from '@/pages/penyusun/sop/hooks/use-sop-prosedur-autosave'
import type { Peraturan } from '@/types/dto/peraturan.dto'
import type { PenyusunWorkbenchLogEdit, StatusSOP } from '@/types/dto/sop.dto'
import type {
  ProsedurRow,
  SOPDetailMetadata,
  SopEditorImplementer,
} from '@/types/ui/sop'
import { useDetailSopPenyusunActions } from './use-detail-sop-penyusun-actions'
import { useDetailSopPenyusunData } from './use-detail-sop-penyusun-data'

export {
  useDetailSopPenyusunActions,
  type UseDetailSopPenyusunActionsParams,
} from './use-detail-sop-penyusun-actions'
export {
  useDetailSopPenyusunData,
  type UseDetailSopPenyusunDataResult,
} from './use-detail-sop-penyusun-data'

/**
 * Facade kontrak halaman Detail SOP Penyusun. Page hanya berinteraksi dengan facade ini;
 * data/autosave dan workflow action diorkestrasi oleh controller terpisah di belakangnya.
 */
export interface UseDetailSopPenyusunReturn {
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
  relatedSopOptions: { id: string; label: string }[]
  peraturanList: Peraturan[]
  currentSopStatus: StatusSOP
  currentSopStatusLabel: string
  isRevisionFlow: boolean
  primaryActionLabel: string
  canKirimUlangKeEvaluator: boolean
  handleMetadataChange: <K extends keyof SOPDetailMetadata>(
    field: K,
    value: SOPDetailMetadata[K],
  ) => void
  handleComplete: (
    id: string | undefined,
    role: string | null,
    navigate: (opts: NavigateOptions) => void,
  ) => Promise<void>
  isKirimUlangKeEvaluatorPending: boolean
  autosaveStatus: SopHeaderAutosaveStatus
  autosaveError: Error | null
  prosedurAutosaveStatus: SopProsedurAutosaveStatus
  prosedurAutosaveError: Error | null
  flushHeaderAutosave: () => Promise<void>
  flushProsedurAutosave: () => Promise<void>
  canEditDetail: boolean
}

export function useDetailSopPenyusun(
  sopDetailId: string | undefined,
  sopStatusOverride: StatusSOP | undefined,
  _isRevisionFlowOverride?: boolean,
): UseDetailSopPenyusunReturn {
  const { showToast } = useToast()
  const { role } = useAppRole()
  const data = useDetailSopPenyusunData(sopDetailId, sopStatusOverride, role)

  const { handleComplete, isKirimUlangPending } = useDetailSopPenyusunActions({
    setSopStatusOverrideAsync: data.setSopStatusOverrideAsync,
    showToast,
    isRevisionFlow: data.isRevisionFlow,
    canKirimUlangKeEvaluator: data.canKirimUlangKeEvaluator,
    flushHeaderAutosave: data.flushHeaderAutosave,
    flushProsedurAutosave: data.flushProsedurAutosave,
  })

  const handleMetadataChange = useCallback(
    <K extends keyof SOPDetailMetadata>(field: K, value: SOPDetailMetadata[K]) => {
      data.setMetadata((prev) => ({ ...prev, [field]: value }))
    },
    [data.setMetadata],
  )

  return {
    metadata: data.metadata,
    setMetadata: data.setMetadata,
    prosedurRows: data.prosedurRows,
    setProsedurRows: data.setProsedurRows,
    implementers: data.implementers,
    setImplementers: data.setImplementers,
    auditLogs: data.auditLogs,
    activeTab: data.activeTab,
    setActiveTab: data.setActiveTab,
    isEditingSteps: data.isEditingSteps,
    setIsEditingSteps: data.setIsEditingSteps,
    isEditPanelCollapsed: data.isEditPanelCollapsed,
    setIsEditPanelCollapsed: data.setIsEditPanelCollapsed,
    rightPanelTab: data.rightPanelTab,
    setRightPanelTab: data.setRightPanelTab,
    isLoading: data.isLoading,
    masterPelaksanaOptions: data.masterPelaksanaOptions,
    relatedPosOptions: data.relatedPosOptions,
    relatedSopOptions: data.relatedSopOptions,
    peraturanList: data.peraturanList,
    currentSopStatus: data.currentSopStatus,
    currentSopStatusLabel: data.currentSopStatusLabel,
    isRevisionFlow: data.isRevisionFlow,
    primaryActionLabel: data.primaryActionLabel,
    canKirimUlangKeEvaluator: data.canKirimUlangKeEvaluator,
    handleMetadataChange,
    handleComplete,
    isKirimUlangKeEvaluatorPending: isKirimUlangPending,
    autosaveStatus: data.autosaveStatus,
    autosaveError: data.autosaveError,
    prosedurAutosaveStatus: data.prosedurAutosaveStatus,
    prosedurAutosaveError: data.prosedurAutosaveError,
    flushHeaderAutosave: data.flushHeaderAutosave,
    flushProsedurAutosave: data.flushProsedurAutosave,
    canEditDetail: data.canEditDetail,
  }
}

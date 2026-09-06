import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  buildAjukanEvaluasiSnapshotRows,
  getAjukanEvaluasiBlockingReason,
  useEvaluasiDraft,
  useEvaluasiSubmit,
  useEvaluasiWorkspaceOpd,
  useEvaluasiWorkspacePengajuan,
  usePengajuanEvaluasiAktif,
  useTolakPengajuanEvaluasi,
} from '@/features/evaluation'
import {
  adaptEvaluasiWorkspace,
  findEvaluasiWorkspaceNilaiOpd,
  findEvaluasiWorkspaceNilaiSop,
  resolveEvaluasiWorkspacePengajuanAktif,
} from '@/features/evaluation/model/evaluasi-workspace.adapter'
import { deriveTahapPenilaianSop } from '@/features/evaluation/model/evaluasi-domain'
import { ApiError } from '@/lib/api/api-client'
import { mapPenyusunWorkbenchToPreviewProps } from '@/lib/sop/detailSop.mappers'
import { useSopPreviewDiagramState } from '@/hooks/use-sop-preview-diagram-state'
import { useDocumentTitle } from '@/hooks/use-document-title'
import type {
  PengajuanEvaluasiSubmitError,
  StatusHasilEvaluasi,
} from '@/types/dto/evaluasi.dto'
import type { DetailEvaluasiActiveTab } from '../components/DetailEvaluasiOPDFormPanel'
import { useCollapsiblePanels } from './use-collapsible-panels'

const POST_SUBMIT_DELAY_MS = 1500

export type EvaluasiWorkspacePageControllerInput =
  | {
      mode: 'opd'
      opdId: string
      preferredSopId?: string
      listHref: string
    }
  | {
      mode: 'pengajuan'
      pengajuanEvaluasiId: string
      preferredSopId?: string
      listHref: string
    }

/**
 * Page Controller workspace evaluasi. Ia memiliki selection + dialog/form orchestration,
 * sementara DTO projection tetap pure di `evaluasi-workspace.adapter`.
 */
export function useEvaluasiWorkspacePageController(props: EvaluasiWorkspacePageControllerInput) {
  const navigate = useNavigate()
  const preferredSopId = props.preferredSopId
  const listHref = props.listHref

  const [selectedSopId, setSelectedSopId] = useState<string | null>(preferredSopId ?? null)
  const preferredSopAppliedRef = useRef(false)

  const workspaceQueryParams = useMemo(
    () => ({
      detailSopId: selectedSopId ?? undefined,
      expand: selectedSopId ? ('preview' as const) : undefined,
      riwayatLimit: 30,
    }),
    [selectedSopId],
  )

  const opdIdArg = props.mode === 'opd' ? props.opdId : ''
  const pengajuanIdArg = props.mode === 'pengajuan' ? props.pengajuanEvaluasiId : ''
  const wOpd = useEvaluasiWorkspaceOpd(opdIdArg, {
    ...workspaceQueryParams,
    enabled: props.mode === 'opd',
  })
  const wPeng = useEvaluasiWorkspacePengajuan(pengajuanIdArg, {
    ...workspaceQueryParams,
    enabled: props.mode === 'pengajuan',
  })

  const workspace = props.mode === 'opd' ? wOpd.data : wPeng.data
  const isLoadingWorkspace = props.mode === 'opd' ? wOpd.isLoading : wPeng.isLoading
  const isFetchingWorkspace = props.mode === 'opd' ? wOpd.isFetching : wPeng.isFetching
  const workspaceError = props.mode === 'opd' ? wOpd.error : wPeng.error

  const opdIdUntukFallback = props.mode === 'opd' ? props.opdId : workspace?.opd.id
  const pengajuanFallbackState = usePengajuanEvaluasiAktif(
    opdIdUntukFallback,
    workspace === undefined ? undefined : workspace.pengajuanAktif,
  )
  const pengajuanAktif = useMemo(
    () => resolveEvaluasiWorkspacePengajuanAktif(workspace, pengajuanFallbackState.pengajuan),
    [workspace, pengajuanFallbackState.pengajuan],
  )

  const projection = useMemo(() => adaptEvaluasiWorkspace(workspace), [workspace])
  const { opd, sops, listItems, judulByDetailId, riwayatOpd } = projection
  const requiresNilaiOpd = pengajuanAktif?.jenis !== 'EVALUASI_REQUEST_OPD'
  const isPengajuanReadOnly =
    pengajuanAktif !== undefined &&
    pengajuanAktif !== null &&
    pengajuanAktif.status !== 'SEDANG_DIEVALUASI'
  const isSopReadOnly = isPengajuanReadOnly
  const opdIdUntukDraft = workspace?.opd.id ?? (props.mode === 'opd' ? props.opdId : undefined)

  const firstSopId = sops[0]?.id ?? null
  useEffect(() => {
    if (!workspace?.daftarSop.length) return
    if (selectedSopId !== null) return
    setSelectedSopId(workspace.daftarSop[0].detailSopId)
  }, [workspace, selectedSopId])

  const effectiveSopId = selectedSopId ?? firstSopId
  const selectedSop = sops.find((sop) => sop.id === effectiveSopId)
  const nilaiSopTerpilih = useMemo(
    () => findEvaluasiWorkspaceNilaiSop(pengajuanAktif, effectiveSopId),
    [pengajuanAktif, effectiveSopId],
  )
  const selectedDaftarRow = useMemo(
    () => workspace?.daftarSop.find((row) => row.detailSopId === effectiveSopId) ?? null,
    [workspace?.daftarSop, effectiveSopId],
  )
  const tahapPenilaianSop = useMemo(() => {
    if (!selectedDaftarRow) return 'belum_dinilai' as const
    return deriveTahapPenilaianSop({
      hasil: selectedDaftarRow.hasilEvaluasi,
      statusTindakLanjut: selectedDaftarRow.statusTindakLanjut ?? null,
      statusDetail: selectedDaftarRow.statusDetail,
    })
  }, [selectedDaftarRow])
  const nilaiOpdTersimpan = useMemo(
    () => findEvaluasiWorkspaceNilaiOpd(workspace, pengajuanAktif),
    [workspace, pengajuanAktif],
  )

  useEffect(() => {
    if (preferredSopAppliedRef.current) return
    if (!preferredSopId) return
    if (!sops.some((sop) => sop.id === preferredSopId)) return
    setSelectedSopId(preferredSopId)
    preferredSopAppliedRef.current = true
  }, [preferredSopId, sops])

  useEffect(() => {
    if (!workspace) return
    const stillInList = sops.some((sop) => sop.id === effectiveSopId)
    if (!stillInList && sops.length > 0) {
      setSelectedSopId(sops[0].id)
    } else if (!stillInList) {
      setSelectedSopId(null)
    }
  }, [workspace, sops, effectiveSopId])

  const draftReadOnly = isPengajuanReadOnly || isSopReadOnly
  const {
    komentarEvaluasi,
    setKomentarEvaluasi,
    statusEvaluasi,
    setStatusEvaluasi,
    saveDraft,
  } = useEvaluasiDraft(
    opdIdUntukDraft,
    effectiveSopId ?? undefined,
    workspace === undefined ? undefined : pengajuanAktif,
    draftReadOnly,
    tahapPenilaianSop,
  )

  const handleSelectSop = useCallback(
    (id: string | null) => {
      saveDraft()
      setSelectedSopId(id)
    },
    [saveDraft],
  )
  const handleSetStatusEvaluasi = useCallback(
    (status: StatusHasilEvaluasi | null) => setStatusEvaluasi(status),
    [setStatusEvaluasi],
  )

  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [isTolakOpen, setIsTolakOpen] = useState(false)
  const [diagramPreviewTab, setDiagramPreviewTab] = useState<'flowchart' | 'bpmn'>('flowchart')
  const [activeFormTab, setActiveFormTab] = useState<DetailEvaluasiActiveTab>('sop')
  const [ratingOPD, setRatingOPD] = useState<number | null>(null)

  useEffect(() => {
    if (!requiresNilaiOpd && activeFormTab === 'opd') setActiveFormTab('sop')
  }, [requiresNilaiOpd, activeFormTab])
  useEffect(() => {
    if (isPengajuanReadOnly && nilaiOpdTersimpan != null) setRatingOPD(nilaiOpdTersimpan)
  }, [isPengajuanReadOnly, nilaiOpdTersimpan])

  const blockingAjukan = useMemo(
    () => getAjukanEvaluasiBlockingReason(pengajuanAktif, ratingOPD),
    [pengajuanAktif, ratingOPD],
  )
  const canAjukan = blockingAjukan === null
  const ajukanSnapshotRows = useMemo(
    () => buildAjukanEvaluasiSnapshotRows(pengajuanAktif ?? null, judulByDetailId),
    [pengajuanAktif, judulByDetailId],
  )

  const logNilaiSopTerpilih = workspace?.logNilaiSopTerpilih ?? []
  const evaluatorSopTerpilih =
    selectedDaftarRow?.evaluatorTerakhir?.nama ?? logNilaiSopTerpilih[0]?.evaluatorNama ?? null
  const tanggalTerakhirEvaluasi =
    selectedDaftarRow?.evaluatorTerakhir?.pada ?? logNilaiSopTerpilih[0]?.createdAt ?? null

  const {
    leftCollapsed,
    setLeftCollapsed,
    rightCollapsed,
    setRightCollapsed,
  } = useCollapsiblePanels()

  const {
    handleSubmitAll,
    evaluasiSubmitError,
    clearEvaluasiSubmitError,
    isSubmitting: isAjukanSubmitting,
  } = useEvaluasiSubmit({
    pengajuanAktifId: pengajuanAktif?.id,
    ratingOPD,
    requiresNilaiOpd,
    canSubmit: canAjukan,
    blockingMessage: blockingAjukan,
    onSuccess: () => {
      setIsSubmitOpen(false)
      setTimeout(() => navigate({ to: listHref }), POST_SUBMIT_DELAY_MS)
    },
  })

  const tolakPengajuan = useTolakPengajuanEvaluasi()
  const handleTolakPengajuan = useCallback(
    async (alasan: string) => {
      if (!pengajuanAktif) return
      await tolakPengajuan.mutateAsync({
        pengajuanEvaluasiId: pengajuanAktif.id,
        alasan,
        version: pengajuanAktif.version,
      })
      setIsTolakOpen(false)
      navigate({ to: listHref })
    },
    [listHref, navigate, pengajuanAktif, tolakPengajuan],
  )

  useDocumentTitle(opd ? `Evaluasi SOP — ${opd.nama}` : undefined)

  const previewProps = useMemo(() => {
    if (!workspace?.preview?.workbench) return null
    try {
      return mapPenyusunWorkbenchToPreviewProps(workspace.preview.workbench)
    } catch {
      return null
    }
  }, [workspace])
  const diagramRenderState = useSopPreviewDiagramState(
    previewProps
      ? {
          diagramKonfigurasi: previewProps.diagramKonfigurasi,
          prosedurRows: previewProps.prosedurRows,
          implementers: previewProps.implementers,
        }
      : null,
    diagramPreviewTab,
  )

  const resourceNotFound = workspaceError instanceof ApiError && workspaceError.status === 404
  const submitErrorObj = useMemo((): PengajuanEvaluasiSubmitError => {
    if (!evaluasiSubmitError) return { kind: 'none', items: [] }
    return { kind: 'blocked', items: [], message: evaluasiSubmitError }
  }, [evaluasiSubmitError])
  const notFoundMessage =
    props.mode === 'opd' ? 'OPD tidak ditemukan.' : 'Pengajuan evaluasi tidak ditemukan.'

  return {
    listHref,
    load: {
      workspace,
      isLoadingWorkspace,
      isFetchingWorkspace,
      workspaceError,
      resourceNotFound,
      notFoundMessage,
    },
    header: {
      opd,
      pengajuanAktif,
      isPengajuanReadOnly,
      evaluatorSopTerpilih,
      tanggalTerakhirEvaluasi,
    },
    list: {
      items: listItems,
      effectiveSopId,
      selectedSop,
      onSelect: handleSelectSop,
      collapsed: leftCollapsed,
      setCollapsed: setLeftCollapsed,
    },
    preview: {
      props: previewProps,
      diagramPreviewTab,
      setDiagramPreviewTab,
      diagramRenderState,
    },
    form: {
      requiresNilaiOpd,
      rightPanelCollapsed: rightCollapsed,
      setRightPanelCollapsed: setRightCollapsed,
      activeFormTab,
      setActiveFormTab,
      effectiveSopId,
      isSopReadOnly,
      tahapPenilaianSop,
      selectedDaftarRow,
      nilaiSopTerpilih,
      statusEvaluasi,
      setStatusEvaluasi: handleSetStatusEvaluasi,
      komentarEvaluasi: komentarEvaluasi ?? '',
      setKomentarEvaluasi,
      logNilaiSopTerpilih,
      isLogNilaiLoading: isFetchingWorkspace,
      nilaiOpdTersimpan,
      riwayatOpd,
      ratingOPD,
      setRatingOPD,
    },
    submit: {
      open: isSubmitOpen,
      setOpen: setIsSubmitOpen,
      snapshotRows: ajukanSnapshotRows,
      canConfirm: canAjukan,
      blockingReason: blockingAjukan,
      handleSubmitAll,
      isSubmitting: isAjukanSubmitting,
      error: submitErrorObj,
      clearError: clearEvaluasiSubmitError,
    },
    reject: {
      open: isTolakOpen,
      setOpen: setIsTolakOpen,
      handle: handleTolakPengajuan,
      isSubmitting: tolakPengajuan.isPending,
    },
  }
}

/**
 * Workspace evaluasi — mode OPD (`GET …/workspace/opd/:id`) atau satu pengajuan (`GET …/workspace/pengajuan/:id`).
 * Data/action orchestration dimiliki page controller; komponen ini hanya render/wiring.
 */
import { Send, List, XCircle } from 'lucide-react'
import { SOPPreviewTemplate } from '@/components/sop/sop-preview-template'
import { PengajuanEvaluasiStatusHeader } from '@/components/evaluasi/pengajuan-evaluasi-status-header'
import { SOPListCard } from '@/components/sop/sop-list-card'
import { Button } from '@/components/ui/button'
import { DetailPageLayout } from '@/components/layout/DetailPageLayout'
import {
  CollapsedStripButton,
  CollapsibleSidePanel,
  CollapsibleSidePanelContent,
  CollapsibleSidePanelHeader,
  SimplePanelHeader,
} from '@/components/ui/collapsible-side-panel'
import { formatDateId } from '@/utils/format-date'
import { DetailEvaluasiOPDSubmitDialog } from './components/DetailEvaluasiOPDSubmitDialog'
import { TolakPengajuanEvaluasiDialog } from './components/TolakPengajuanEvaluasiDialog'
import { DetailEvaluasiOPDFormPanel } from './components/DetailEvaluasiOPDFormPanel'
import {
  useEvaluasiWorkspacePageController,
  type EvaluasiWorkspacePageControllerInput,
} from './hooks/use-evaluasi-workspace-page-controller'

export type EvaluasiWorkspacePageProps = EvaluasiWorkspacePageControllerInput

export function EvaluasiWorkspacePage(props: EvaluasiWorkspacePageProps) {
  const controller = useEvaluasiWorkspacePageController(props)
  const { listHref, load, header, list, preview, form, submit, reject } = controller

  const {
    workspace,
    isLoadingWorkspace,
    workspaceError,
    resourceNotFound,
    notFoundMessage,
  } = load
  const {
    opd,
    pengajuanAktif: pengajuanAktifEffektif,
    isPengajuanReadOnly,
    evaluatorSopTerpilih,
    tanggalTerakhirEvaluasi,
  } = header
  const {
    items: listItems,
    effectiveSopId,
    selectedSop,
    onSelect: handleSelectSop,
    collapsed: leftPanelCollapsed,
    setCollapsed: setLeftPanelCollapsed,
  } = list
  const {
    props: previewProps,
    diagramPreviewTab,
    setDiagramPreviewTab,
    diagramRenderState,
  } = preview
  const {
    requiresNilaiOpd,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    activeFormTab,
    setActiveFormTab,
    isSopReadOnly,
    tahapPenilaianSop,
    selectedDaftarRow,
    nilaiSopTerpilih,
    statusEvaluasi,
    setStatusEvaluasi: handleSetStatusEvaluasi,
    komentarEvaluasi,
    setKomentarEvaluasi,
    logNilaiSopTerpilih,
    isLogNilaiLoading,
    nilaiOpdTersimpan,
    riwayatOpd,
    ratingOPD,
    setRatingOPD,
  } = form
  const {
    open: isSubmitOpen,
    setOpen: setIsSubmitOpen,
    snapshotRows: ajukanSnapshotRows,
    canConfirm: canAjukan,
    blockingReason: blockingAjukan,
    handleSubmitAll,
    isSubmitting: isAjukanSubmitting,
    error: submitErrorObj,
    clearError: clearEvaluasiSubmitError,
  } = submit
  const {
    open: isTolakOpen,
    setOpen: setIsTolakOpen,
    handle: handleTolakPengajuan,
    isSubmitting: isTolakSubmitting,
  } = reject

  if (isLoadingWorkspace && !workspace) {
    return (
      <DetailPageLayout
        breadcrumb={[{ label: 'Evaluasi SOP', to: listHref }]}
        title="Evaluasi SOP"
        description=""
        backTo={listHref}
        main={
          <p className="p-4 text-sm text-secondary-foreground">Memuat data evaluasi…</p>
        }
      />
    )
  }

  if (workspaceError && !resourceNotFound) {
    return (
      <DetailPageLayout
        breadcrumb={[{ label: 'Evaluasi SOP', to: listHref }]}
        title="Evaluasi SOP"
        description=""
        backTo={listHref}
        main={
          <p className="p-4 text-sm text-red-600">
            {workspaceError instanceof Error
              ? workspaceError.message
              : 'Gagal memuat data evaluasi.'}
          </p>
        }
      />
    )
  }

  if (resourceNotFound || (!opd && !isLoadingWorkspace)) {
    return (
      <DetailPageLayout
        breadcrumb={[{ label: 'Evaluasi SOP', to: listHref }]}
        title="Evaluasi SOP"
        description=""
        backTo={listHref}
        main={<p className="p-4 text-sm text-secondary-foreground">{notFoundMessage}</p>}
      />
    )
  }

  if (!opd) {
    return (
      <DetailPageLayout
        breadcrumb={[{ label: 'Evaluasi SOP', to: listHref }]}
        title="Evaluasi SOP"
        description=""
        backTo={listHref}
        main={
          <p className="p-4 text-sm text-secondary-foreground">Memuat data OPD…</p>
        }
      />
    )
  }

  return (
    <>
      <DetailPageLayout
        breadcrumb={[
          { label: 'Evaluasi SOP', to: listHref },
          { label: opd.nama },
        ]}
        title={`Evaluasi SOP — ${opd.nama}`}
        description={
          pengajuanAktifEffektif?.status === 'DITOLAK'
            ? 'Pengajuan ditolak final. Seluruh versi SOP di dalamnya tidak dapat diajukan ulang dan penyusun wajib membuat versi baru.'
            : isPengajuanReadOnly
              ? 'Mode baca — pengajuan evaluasi ini sudah selesai. Lihat hasil dan riwayat di panel kanan.'
              : 'Pilih SOP di daftar kiri, isi form evaluasi di panel kanan.'
        }
        backTo={listHref}
        backSize="icon"
        header={
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-foreground">Penilaian SOP</h2>
              <div className="flex items-center gap-2">
                {!isPengajuanReadOnly ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-red-200 px-3 text-xs text-red-700 hover:bg-red-50"
                      onClick={() => setIsTolakOpen(true)}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Tolak Pengajuan
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 rounded-control bg-primary px-3 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                      onClick={() => {
                        clearEvaluasiSubmitError()
                        setIsSubmitOpen(true)
                      }}
                    >
                      <Send className="w-3.5 h-3.5" /> Ajukan Persetujuan Evaluasi
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {pengajuanAktifEffektif?.status ? (
              <PengajuanEvaluasiStatusHeader
                status={pengajuanAktifEffektif.status}
                statusLabel={pengajuanAktifEffektif.statusLabel}
                role="EVALUATOR"
                className="pt-1"
              />
            ) : null}
            {pengajuanAktifEffektif?.status === 'DITOLAK' &&
            pengajuanAktifEffektif.alasanPenolakan ? (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                <p className="font-medium">Alasan penolakan</p>
                <p className="mt-1 whitespace-pre-wrap break-words">
                  {pengajuanAktifEffektif.alasanPenolakan}
                </p>
              </div>
            ) : null}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-secondary-foreground">
              <span>
                <span className="text-muted-foreground">Evaluator (SOP ini):</span>{' '}
                <span className="font-medium">{evaluatorSopTerpilih ?? '—'}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Terakhir evaluasi:</span>{' '}
                {tanggalTerakhirEvaluasi ? formatDateId(tanggalTerakhirEvaluasi) : '—'}
              </span>
            </div>
          </>
        }
        leftPanel={
          <CollapsibleSidePanel
            side="left"
            collapsed={leftPanelCollapsed}
            widthExpanded="w-full"
          >
            {leftPanelCollapsed ? (
              <CollapsedStripButton
                label="Daftar"
                icon={<List className="w-5 h-5" />}
                onClick={() => setLeftPanelCollapsed(false)}
              />
            ) : (
              <>
                <CollapsibleSidePanelHeader
                  side="left"
                  onCollapse={() => setLeftPanelCollapsed(true)}
                  className="border-border bg-surface-subtle/90 px-2 py-1.5 sm:px-2.5"
                >
                  <SimplePanelHeader
                    title="Daftar SOP"
                    subtitle={`${listItems.length} dokumen`}
                  />
                </CollapsibleSidePanelHeader>
                <CollapsibleSidePanelContent className="px-2 pb-2 pt-1 sm:px-2">
                  <div className="flex flex-col h-full min-h-0">
                    <p className="px-2 pb-2 text-[10px] text-muted-foreground leading-snug shrink-0">
                      Dokumen = status SOP di sistem; Penilaian = hasil evaluasi Anda per dokumen.
                    </p>
                    <div className="flex-1 min-h-0 overflow-auto scrollbar-hide">
                      <SOPListCard
                        items={listItems}
                        selectedId={effectiveSopId}
                        onSelect={handleSelectSop}
                        variant="compact"
                      />
                    </div>
                  </div>
                </CollapsibleSidePanelContent>
              </>
            )}
          </CollapsibleSidePanel>
        }
        main={
          <div className="flex h-full min-h-0 flex-col">
            <div className="p-2 border-b border-border bg-surface-subtle flex-shrink-0 print:hidden">
              <h3 className="text-xs font-semibold text-secondary-foreground">Preview SOP</h3>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              {selectedSop ? (
                previewProps ? (
                  <SOPPreviewTemplate
                    metadata={previewProps.metadata}
                    prosedurRows={previewProps.prosedurRows}
                    implementers={previewProps.implementers}
                    name={previewProps.name}
                    number={previewProps.number}
                    tteSignaturePayload={
                      workspace?.preview?.workbench?.tteSignaturePayloadKepalaOpd
                    }
                    diagramState={{
                      activeTab: diagramPreviewTab,
                      onActiveTabChange: setDiagramPreviewTab,
                      ...diagramRenderState,
                    }}
                  />
                ) : (
                  <SOPPreviewTemplate
                    name={selectedSop.judul}
                    number={selectedSop.nomorSOP}
                  />
                )
              ) : (
                <div className="flex items-center justify-center flex-1 text-xs text-muted-foreground">
                  Pilih SOP di daftar kiri
                </div>
              )}
            </div>
          </div>
        }
        rightPanel={
          <DetailEvaluasiOPDFormPanel
            penilaianOpdDiizinkan={requiresNilaiOpd}
            panelState={{
              collapsed: rightPanelCollapsed,
              onCollapsedChange: setRightPanelCollapsed,
              activeFormTab,
              onTabChange: setActiveFormTab,
            }}
            sopForm={{
              effectiveSopId,
              readOnly: isSopReadOnly,
              tahapPenilaian: tahapPenilaianSop,
              versi:
                selectedDaftarRow?.versi ?? nilaiSopTerpilih?.versi ?? undefined,
              detailUpdatedAt:
                selectedDaftarRow?.detailUpdatedAt ??
                nilaiSopTerpilih?.detailUpdatedAt ??
                null,
              ditindaklanjutiPada:
                selectedDaftarRow?.ditindaklanjutiPada ??
                nilaiSopTerpilih?.ditindaklanjutiPada ??
                null,
              nilaiTersimpan: nilaiSopTerpilih
                ? {
                    hasil:
                      nilaiSopTerpilih.hasil === 'SESUAI' ||
                      nilaiSopTerpilih.hasil === 'PERLU_PERBAIKAN'
                        ? nilaiSopTerpilih.hasil
                        : null,
                    catatan: nilaiSopTerpilih.catatan,
                  }
                : null,
              statusEvaluasi,
              setStatusEvaluasi: handleSetStatusEvaluasi,
              komentarEvaluasi,
              setKomentarEvaluasi,
              logNilaiEntries: logNilaiSopTerpilih,
              isLogNilaiLoading,
            }}
            opdForm={{
              opd,
              readOnly: isPengajuanReadOnly,
              nilaiOpdTersimpan,
              riwayatOpd,
              ratingOPD,
              setRatingOPD,
            }}
          />
        }
      />

      <DetailEvaluasiOPDSubmitDialog
        requiresNilaiOpdInCopy={requiresNilaiOpd}
        open={isSubmitOpen}
        onOpenChange={(open) => {
          setIsSubmitOpen(open)
          if (!open) clearEvaluasiSubmitError()
        }}
        snapshotRows={ajukanSnapshotRows}
        canConfirm={canAjukan}
        blockingReason={blockingAjukan}
        onConfirm={(nomorBA: string) => void handleSubmitAll(nomorBA)}
        isSubmitting={isAjukanSubmitting}
        evaluasiSubmitError={submitErrorObj}
      />
      <TolakPengajuanEvaluasiDialog
        open={isTolakOpen}
        onOpenChange={setIsTolakOpen}
        jumlahSop={pengajuanAktifEffektif?.nilaiPerDetail.length ?? 0}
        onConfirm={(alasan) => void handleTolakPengajuan(alasan)}
        isSubmitting={isTolakSubmitting}
      />
    </>
  )
}

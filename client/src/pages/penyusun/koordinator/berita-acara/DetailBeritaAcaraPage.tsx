import { useEffect, useMemo, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import {
  usePengajuanBeritaAcaraView,
  usePengajuanEvaluasiDetail,
  usePengajuanSopDokumenWorkbench,
} from '@/features/evaluation'
import { PinVerificationDialog } from '@/features/tte/ui/pin-verification-dialog'
import { TteSetupRequiredDialog } from '@/features/tte/ui/tte-setup-required-dialog'
import { createPinConfirmHandler, useTandaTanganiBA } from '@/features/tte/api'
import { BeritaAcaraPreviewPane } from '@/features/submission/ui/berita-acara-preview-pane'
import { DocumentPreviewTabs } from '@/features/submission/ui/document-preview-tabs'
import { SopDocumentPreviewPane } from '@/features/submission/ui/sop-document-preview-pane'
import { mapBeritaAcaraTemplateProps } from '@/features/submission/model/map-berita-acara-template-props'
import { SopWorkbenchSidePanel } from '@/features/sop/ui/sop-workbench-side-panel'
import { DetailPageLayout } from '@/app/layout/DetailPageLayout'
import { Button } from '@/shared/ui/button'
import { BackButton } from '@/shared/ui/back-button'
import { NotFoundWithBack } from '@/shared/ui/not-found'
import { PengajuanEvaluasiStatusHeader } from '@/features/evaluation/ui/pengajuan-evaluasi-status-header'
import { InfoCard } from '@/shared/ui/info-card'
import { InfoField } from '@/shared/ui/info-field'
import { mapPenyusunWorkbenchToPreviewProps } from '@/features/sop/model/detailSop.mappers'
import { parseTTESignaturePayload } from '@/features/tte/model/parse-tte-signature-payload'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { LoadingState } from '@/shared/ui/loading-state'
import { ROUTES } from '@/shared/lib/constants'
import { PengajuanCetakArsipButtons } from '@/features/submission/ui/PengajuanCetakArsipButtons'
import { usePengajuanCetakArsip } from '@/features/submission/ui/hooks/use-pengajuan-cetak-arsip'
import { canCetakBeritaAcaraPengajuan, canCetakSopArsipPengajuan } from '@/features/submission/print/pengajuan-print'
import { formatDateIdFull } from '@/shared/lib/format-date'
import { useRequireTteSetup } from '@/features/tte/hooks/use-require-tte-setup'

type PengajuanDetail = NonNullable<ReturnType<typeof usePengajuanEvaluasiDetail>['pengajuan']>
type PengajuanSopList = NonNullable<PengajuanDetail['sopList']>
const EMPTY_SOP_LIST: PengajuanSopList = []

export function DetailBeritaAcaraPage() {
  const { id } = useParams({ from: '/penyusun/pj-penyusun/berita-acara/$id' })
  const [tteDialogOpen, setTteDialogOpen] = useState(false)
  const [previewMainTab, setPreviewMainTab] = useState<'sop' | 'ba'>('ba')
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [selectedSopId, setSelectedSopId] = useState<string | null>(null)
  const { pengajuan, loading: isLoading } = usePengajuanEvaluasiDetail(id)
  const {
    tteSetupDialogOpen,
    setTteSetupDialogOpen,
    requireTteReady,
    handleTteSigningError,
  } = useRequireTteSetup()

  useEffect(() => {
    setSelectedSopId(null)
  }, [id])

  const tandaTanganiBA = useTandaTanganiBA({
    isPjPenyusun: true,
    suppressSetupRequiredToast: true,
  })
  const nomorBaLabel = pengajuan?.nomorBA ?? `BA-${id.slice(0, 8)}`
  const handlePinConfirm = createPinConfirmHandler(
    tandaTanganiBA.mutateAsync,
    (pin) => ({
      pengajuanId: id,
      payload: {
        pin,
        nomorDokumen: nomorBaLabel,
        judulDokumen: `Berita Acara Evaluasi - ${nomorBaLabel}`,
      },
    }),
    undefined,
    (error) => handleTteSigningError(error, () => setTteDialogOpen(false)),
  )
  const handleOpenTteDialog = () => {
    void requireTteReady(() => setTteDialogOpen(true))
  }

  const isReadyForSignature = pengajuan?.status === 'DITANDATANGANI_PJ_EVALUATOR'
  const isAlreadySigned = pengajuan?.status === 'DITANDATANGANI_PJ_PENYUSUN'
  const sopList = pengajuan?.sopList ?? EMPTY_SOP_LIST
  const canCetakBa = canCetakBeritaAcaraPengajuan(pengajuan?.status)
  const canCetakSopArsip = canCetakSopArsipPengajuan(pengajuan?.status)
  const firstSopDetailId = sopList[0]?.sopDetailId ?? null
  const effectiveSopDetailId = selectedSopId ?? firstSopDetailId
  const selectedSop = sopList.find((sop) => sop.sopDetailId === effectiveSopDetailId) ?? null

  const sopWorkbenchEnabled = Boolean(
    effectiveSopDetailId && (previewMainTab === 'sop' || canCetakSopArsip),
  )
  const {
    data: sopDokumen,
    isFetching: sopWorkbenchLoading,
    isError: sopWorkbenchError,
    refetch: refetchSopDokumen,
  } = usePengajuanSopDokumenWorkbench(id, effectiveSopDetailId, {
    enabled: sopWorkbenchEnabled,
  })

  const sopPreviewProps = useMemo(() => {
    const wb = sopDokumen?.workbench
    if (wb === undefined) return null
    return mapPenyusunWorkbenchToPreviewProps(wb)
  }, [sopDokumen])

  const tteSignaturePayloadKepalaOpd = useMemo(
    () => parseTTESignaturePayload(sopDokumen?.tteSignaturePayloadKepalaOpd),
    [sopDokumen?.tteSignaturePayloadKepalaOpd],
  )

  const isSopPreviewLoading = sopWorkbenchEnabled && sopPreviewProps === null && sopWorkbenchLoading
  const { data: baView, isFetching: baViewLoading } = usePengajuanBeritaAcaraView(id, {
    enabled: Boolean(pengajuan && (previewMainTab === 'ba' || canCetakBa)),
  })

  const baTemplateProps = useMemo(
    () =>
      pengajuan != null
        ? mapBeritaAcaraTemplateProps({
            pengajuan,
            baView,
            overrides: {
              namaPjPenyusun: pengajuan.namaPjPenyusun ?? 'PJ Penyusun OPD',
            },
          })
        : null,
    [pengajuan, baView],
  )

  const { handleCetak, cetakLoading } = usePengajuanCetakArsip({
    pengajuanId: id,
    pengajuan,
    effectiveSopDetailId,
    baTemplateProps,
    sopPreviewProps,
    tteSignaturePayload: tteSignaturePayloadKepalaOpd ?? null,
  })

  if (isLoading && pengajuan === null) {
    return (
      <LoadingState className="min-h-[320px]" message="Memuat detail Berita Acara…" />
    )
  }

  if (pengajuan === null) {
    return (
      <NotFoundWithBack
        message="Pengajuan evaluasi tidak ditemukan."
        backAction={
          <BackButton to={ROUTES.PENYUSUN.PJ_PENYUSUN_BERITA_ACARA}>
            Kembali
          </BackButton>
        }
      />
    )
  }

  const workbenchSopItems = sopList.map((sop) => ({
    id: sop.sopDetailId,
    nama: sop.nama,
    nomor: sop.nomor,
    statusDokumen: sop.status,
    statusDokumenLabel: sop.statusLabel ?? sop.status,
    hasilEvaluasi: sop.hasil,
    hasilEvaluasiLabel: sop.hasilLabel,
  }))

  return (
    <>
      <DetailPageLayout
        breadcrumb={[
          { label: 'PJ Penyusun', to: ROUTES.PENYUSUN.SOP },
          { label: 'Berita Acara', to: ROUTES.PENYUSUN.PJ_PENYUSUN_BERITA_ACARA },
        ]}
        title="Detail Berita Acara"
        description={
          pengajuan.nomorBA
            ? `${pengajuan.nomorBA} — tanda tangani Berita Acara dengan tanda tangan elektronik.`
            : 'Tanda tangani Berita Acara dengan tanda tangan elektronik.'
        }
        backTo={ROUTES.PENYUSUN.PJ_PENYUSUN_BERITA_ACARA}
        backSize="icon"
        header={
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground">Informasi Evaluasi</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <PengajuanCetakArsipButtons
                  printScope="pj-penyusun-kepala-opd"
                  pengajuanStatus={pengajuan.status}
                  effectiveSopDetailId={effectiveSopDetailId}
                  sopCount={sopList.length}
                  cetakLoading={cetakLoading}
                  onCetak={handleCetak}
                />
                {isReadyForSignature && (
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleOpenTteDialog}
                    disabled={tandaTanganiBA.isPending}
                  >
                    {tandaTanganiBA.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Menandatangani...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Tanda Tangan TTE
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              <InfoField label="Nomor BA">
                <span className="font-mono">{pengajuan.nomorBA ?? '-'}</span>
              </InfoField>
              <InfoField label="Tanggal Tanda Tangan">{formatDateIdFull(pengajuan.tanggalVerifikasi, '')}</InfoField>
              <InfoField label="Evaluator">{pengajuan.timEvaluasi ?? '-'}</InfoField>
              <InfoField label="Jumlah SOP">{`${sopList.length} dokumen`}</InfoField>
            </div>
            <PengajuanEvaluasiStatusHeader
              status={pengajuan.status}
              statusLabel={pengajuan.statusLabel ?? pengajuan.status}
              role="PJ_PENYUSUN"
            />
            {isReadyForSignature && (
              <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
                <div className="flex gap-2.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-warning-foreground" />
                  <p className="text-xs leading-relaxed text-warning-foreground">
                    Berita Acara ini telah ditandatangani PJ Evaluator dan menunggu tanda tangan Anda.
                  </p>
                </div>
              </div>
            )}
            {isAlreadySigned && (
              <InfoCard variant="success" icon={<CheckCircle />} title="Berita Acara telah ditandatangani">
                Ditandatangani pada {formatDateIdFull(pengajuan.tanggalTTDBaPjPenyusun, '')}. Menunggu pengesahan
                Kepala OPD.
              </InfoCard>
            )}
          </div>
        }
        leftPanel={
          <SopWorkbenchSidePanel
            collapsed={leftPanelCollapsed}
            onCollapse={() => setLeftPanelCollapsed(true)}
            onExpand={() => setLeftPanelCollapsed(false)}
            items={workbenchSopItems}
            selectedId={effectiveSopDetailId}
            onSelect={setSelectedSopId}
          />
        }
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <DocumentPreviewTabs
            value={previewMainTab}
            onValueChange={setPreviewMainTab}
            tabs={[
              {
                value: 'sop',
                label: 'Pratinjau SOP',
                contentClassName:
                  'mt-3 flex min-h-0 flex-1 flex-col overflow-auto px-2 pb-2',
                content: (
                  <SopDocumentPreviewPane
                    selectedSop={selectedSop}
                    isLoading={isSopPreviewLoading}
                    sopPreviewProps={sopPreviewProps}
                    tteSignaturePayload={tteSignaturePayloadKepalaOpd ?? null}
                    loadingMessage="Memuat dokumen SOP…"
                    errorMessage={
                      sopWorkbenchError
                        ? 'Dokumen lengkap SOP dalam pengajuan evaluasi tidak dapat dimuat.'
                        : undefined
                    }
                    onRetry={
                      sopWorkbenchError ? () => void refetchSopDokumen() : undefined
                    }
                  />
                ),
              },
              {
                value: 'ba',
                label: 'Berita Acara',
                contentClassName:
                  'mt-2 flex min-h-0 flex-1 flex-col overflow-auto px-1 pb-1 sm:px-2',
                content:
                  baTemplateProps != null ? (
                    <BeritaAcaraPreviewPane
                      isLoading={baViewLoading && baTemplateProps == null}
                      templateProps={baTemplateProps}
                    />
                  ) : null,
              },
            ]}
          />
        </div>
      </DetailPageLayout>

      <PinVerificationDialog
        open={tteDialogOpen}
        onOpenChange={setTteDialogOpen}
        title="Tanda Tangan — PIN TTE"
        description="Masukkan PIN TTE untuk menandatangani Berita Acara ini (simulasi)."
        onConfirm={handlePinConfirm}
      />
      <TteSetupRequiredDialog
        open={tteSetupDialogOpen}
        onOpenChange={setTteSetupDialogOpen}
      />
    </>
  )
}

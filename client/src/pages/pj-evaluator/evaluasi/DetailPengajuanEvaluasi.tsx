import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { CheckCircle, History } from "lucide-react";
import { LoadingState } from "@/shared/ui/loading-state";
import { PengajuanCetakArsipButtons } from "@/features/submission/ui/PengajuanCetakArsipButtons";
import { usePengajuanCetakArsip } from "@/features/submission/ui/hooks/use-pengajuan-cetak-arsip";
import { canCetakBeritaAcaraPengajuan, canCetakSopArsipPengajuan } from "@/features/submission/print/pengajuan-print";
import { BeritaAcaraPreviewPane } from "@/features/submission/ui/berita-acara-preview-pane";
import { SopDocumentPreviewPane } from "@/features/submission/ui/sop-document-preview-pane";
import { mapBeritaAcaraTemplateProps } from "@/features/submission/model/map-berita-acara-template-props";
import { SopWorkbenchSidePanel } from "@/features/sop/ui/sop-workbench-side-panel";
import { formatDateId } from "@/shared/lib/format-date";
import { PinVerificationDialog } from "@/features/tte/ui/pin-verification-dialog";
import { TteSetupRequiredDialog } from "@/features/tte/ui/tte-setup-required-dialog";
import { createPinConfirmHandler } from "@/features/tte/api";
import { useTandaTanganiBA } from "@/features/tte/api";
import {
  usePengajuanBeritaAcaraView,
  usePengajuanEvaluasiDetail,
  usePengajuanSopDokumenWorkbench,
} from "@/features/evaluation";
import { mapPenyusunWorkbenchToPreviewProps } from "@/features/sop/model/detailSop.mappers";
import { parseTTESignaturePayload } from "@/features/tte/model/parse-tte-signature-payload";
import { RiwayatEvaluasiTimeline } from "@/pages/pj-evaluator/evaluasi/components/RiwayatEvaluasiTimeline";
import { ROUTES } from "@/shared/lib/constants";
import { Button } from "@/shared/ui/button";
import { BackButton } from "@/shared/ui/back-button";
import { NotFoundWithBack } from "@/shared/ui/not-found";
import { DetailPageLayout } from "@/app/layout/DetailPageLayout";
import {
  CollapsedStripButton,
  CollapsibleSidePanel,
  CollapsibleSidePanelContent,
  CollapsibleSidePanelHeader,
  SimplePanelHeader,
} from "@/shared/ui/collapsible-side-panel";
import { PengajuanEvaluasiStatusHeader } from "@/features/evaluation/ui/pengajuan-evaluasi-status-header";
import { InfoField } from "@/shared/ui/info-field";
import { DocumentPreviewTabs } from "@/features/submission/ui/document-preview-tabs";
import { useDocumentTitle } from "@/shared/hooks/use-document-title";
import { useRequireTteSetup } from "@/features/tte/hooks/use-require-tte-setup";
import { IA } from "@/shared/lib/constants";

export function DetailPengajuanEvaluasi() {
  const { id } = useParams({
    from: "/pj-evaluator/evaluasi/$id",
  });
  const { pengajuan, canVerify, loading } = usePengajuanEvaluasiDetail(id);
  const [previewMainTab, setPreviewMainTab] = useState<"sop" | "ba">("sop");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [selectedSopId, setSelectedSopId] = useState<string | null>(null);
  const [tteDialogOpen, setTteDialogOpen] = useState(false);
  const {
    tteSetupDialogOpen,
    setTteSetupDialogOpen,
    requireTteReady,
    handleTteSigningError,
  } = useRequireTteSetup();

  const tandaTanganiBA = useTandaTanganiBA({
    successMessage:
      "Tanda Tangan Berita Acara oleh PJ Evaluator berhasil. PJ Penyusun dapat melanjutkan tanda tangan BA.",
    suppressSetupRequiredToast: true,
  });

  const handlePinConfirm = createPinConfirmHandler(
    tandaTanganiBA.mutateAsync,
    (pin) => ({
      pengajuanId: pengajuan?.id ?? "",
      payload: {
        pin,
        nomorDokumen: pengajuan?.nomorBA ?? `BA-${pengajuan?.opdNama ?? ""}`,
        judulDokumen: `Berita Acara Evaluasi - ${pengajuan?.opdNama ?? ""}`,
      },
    }),
    undefined,
    (error) => handleTteSigningError(error, () => setTteDialogOpen(false)),
  );
  const handleOpenTteDialog = () => {
    void requireTteReady(() => setTteDialogOpen(true));
  };

  const sopList = pengajuan?.sopList ?? [];
  const canCetakBa = canCetakBeritaAcaraPengajuan(pengajuan?.status);
  const canCetakSopArsip = canCetakSopArsipPengajuan(pengajuan?.status);
  const firstSopDetailId = sopList[0]?.sopDetailId ?? null;
  const effectiveSopDetailId = selectedSopId ?? firstSopDetailId;
  const displaySop = sopList.find(
    (s) => s.sopDetailId === effectiveSopDetailId,
  );

  const sopWorkbenchEnabled = Boolean(
    pengajuan && effectiveSopDetailId && (previewMainTab === "sop" || canCetakSopArsip),
  );
  const { data: sopDokumen, isFetching: sopWorkbenchLoading } =
    usePengajuanSopDokumenWorkbench(id, effectiveSopDetailId, {
      enabled: sopWorkbenchEnabled,
    });

  const sopPreviewProps = useMemo(() => {
    const wb = sopDokumen?.workbench;
    if (wb === undefined) {
      return null;
    }
    return mapPenyusunWorkbenchToPreviewProps(wb);
  }, [sopDokumen]);

  const tteSignaturePayloadKepalaOpd = useMemo(
    () => parseTTESignaturePayload(sopDokumen?.tteSignaturePayloadKepalaOpd),
    [sopDokumen?.tteSignaturePayloadKepalaOpd],
  );

  const baViewEnabled = Boolean(pengajuan && (previewMainTab === "ba" || canCetakBa));
  const { data: baView, isFetching: baViewLoading } = usePengajuanBeritaAcaraView(
    id,
    { enabled: baViewEnabled },
  );

  const baTemplateProps = useMemo(
    () =>
      pengajuan != null
        ? mapBeritaAcaraTemplateProps({ pengajuan, baView })
        : null,
    [pengajuan, baView],
  );

  const { handleCetak, cetakLoading } = usePengajuanCetakArsip({
    pengajuanId: id,
    pengajuan,
    effectiveSopDetailId,
    baTemplateProps,
    sopPreviewProps,
    tteSignaturePayload: tteSignaturePayloadKepalaOpd ?? null,
  });

  useDocumentTitle(
    pengajuan
      ? `${IA.REQUEST_EVALUATOR_EVALUASI_OPD} — ${pengajuan.opdNama}`
      : undefined,
  );

  if (loading && pengajuan === null) {
    return (
      <LoadingState className="min-h-[320px]" message="Memuat pengajuan evaluasi…" />
    );
  }

  if (pengajuan === null) {
    return (
      <NotFoundWithBack
        message="Pengajuan evaluasi tidak ditemukan."
        backAction={
          <BackButton to={ROUTES.PJ_EVALUATOR.EVALUASI}>
            Kembali
          </BackButton>
        }
      />
    );
  }

  const workbenchSopItems = sopList.map((sop) => ({
    id: sop.sopDetailId,
    nama: sop.nama,
    nomor: sop.nomor,
    statusDokumen: sop.status,
    statusDokumenLabel: sop.statusLabel ?? sop.status,
    hasilEvaluasi: sop.hasil,
    hasilEvaluasiLabel: sop.hasilLabel,
  }));

  return (
    <>
      <DetailPageLayout
        breadcrumb={[
          {
            label: IA.NAV_BIRO_EVALUASI_REQUEST_EVALUATOR,
            to: ROUTES.PJ_EVALUATOR.EVALUASI,
          },
          { label: pengajuan.opdNama ?? "" },
        ]}
        title={`${IA.REQUEST_EVALUATOR_EVALUASI_OPD} — ${pengajuan.opdNama}`}
        description={`${IA.VERIFIKASI_BA_BIRO} pada dokumen ${IA.BERITA_ACARA}. Setelah ini: PJ Penyusun → ${IA.PENGESAHAN_SOP} oleh Kepala OPD.`}
        backTo={ROUTES.PJ_EVALUATOR.EVALUASI}
        backSize="icon"
        header={
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Informasi OPD & Evaluasi
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <PengajuanCetakArsipButtons
                  printScope="pj-evaluator"
                  pengajuanStatus={pengajuan.status}
                  effectiveSopDetailId={effectiveSopDetailId}
                  sopCount={sopList.length}
                  cetakLoading={cetakLoading}
                  onCetak={handleCetak}
                />
                {canVerify && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleOpenTteDialog}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Tanda Tangan BA
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
              <InfoField label="OPD">{pengajuan.opdNama}</InfoField>
              <InfoField label="Jenis">{pengajuan.jenis}</InfoField>
              <InfoField label="Tanggal Evaluasi">
                {pengajuan.tanggalEvaluasi
                  ? formatDateId(pengajuan.tanggalEvaluasi)
                  : ""}
              </InfoField>
              {pengajuan.nilaiOPD && (
                <InfoField label="Nilai OPD">
                  {pengajuan.nilaiOPD.toString()}
                </InfoField>
              )}
            </div>
            <PengajuanEvaluasiStatusHeader
              status={pengajuan.status}
              statusLabel={pengajuan.statusLabel ?? pengajuan.status}
              role="PJ_EVALUATOR"
            />
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
        rightPanel={
          <CollapsibleSidePanel
            side="right"
            collapsed={rightPanelCollapsed}
            widthCollapsed="w-10"
            widthExpanded="w-[min(320px,28vw)]"
          >
            {rightPanelCollapsed ? (
              <CollapsedStripButton
                label="Riwayat"
                icon={<History className="w-4 h-4" />}
                onClick={() => setRightPanelCollapsed(false)}
              />
            ) : (
              <>
                <CollapsibleSidePanelHeader
                  side="right"
                  onCollapse={() => setRightPanelCollapsed(true)}
                  className="border-border bg-surface-subtle/90 px-2 py-1.5 sm:px-2.5"
                >
                  <SimplePanelHeader title="Riwayat evaluasi" />
                </CollapsibleSidePanelHeader>
                <CollapsibleSidePanelContent className="px-2 pb-2 pt-1 sm:px-2">
                  <RiwayatEvaluasiTimeline logs={pengajuan.riwayatEvaluasi ?? []} />
                </CollapsibleSidePanelContent>
              </>
            )}
          </CollapsibleSidePanel>
        }
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <DocumentPreviewTabs
            value={previewMainTab}
            onValueChange={setPreviewMainTab}
            headerClassName="px-0 py-1"
            listClassName="h-7 gap-1"
            triggerClassName="h-7 px-2.5"
            tabs={[
              {
                value: "sop",
                label: "Pratinjau SOP",
                contentClassName:
                  "mt-1 flex min-h-0 flex-1 flex-col overflow-auto px-0 pb-0.5 sm:px-0.5",
                content: (
                  <SopDocumentPreviewPane
                    selectedSop={displaySop}
                    isLoading={sopWorkbenchLoading}
                    sopPreviewProps={sopPreviewProps}
                    tteSignaturePayload={tteSignaturePayloadKepalaOpd ?? null}
                    loadingMessage="Memuat dokumen SOP…"
                  />
                ),
              },
              {
                value: "ba",
                label: "Berita Acara",
                contentClassName:
                  "mt-1 flex min-h-0 flex-1 flex-col overflow-auto px-0 pb-0.5 sm:px-0.5",
                content:
                  baTemplateProps != null ? (
                    <BeritaAcaraPreviewPane
                      isLoading={baViewLoading}
                      templateProps={baTemplateProps}
                      loadingMessage="Memuat Berita Acara…"
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
        title="Tanda Tangan Berita Acara"
        onConfirm={handlePinConfirm}
      />
      <TteSetupRequiredDialog
        open={tteSetupDialogOpen}
        onOpenChange={setTteSetupDialogOpen}
      />
    </>
  );
}

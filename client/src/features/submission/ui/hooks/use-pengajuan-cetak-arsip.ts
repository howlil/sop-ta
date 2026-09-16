import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { evaluasiApi } from '@/features/evaluation'
import { tteApi } from '@/features/tte/api'
import type { BeritaAcaraTemplateProps } from '@/features/submission/ui/berita-acara-template'
import type { SopPreviewWorkbenchProps } from '@/features/submission/ui/sop-document-preview-pane'
import { queryKeys } from '@/app/config/query-keys'
import { useToast } from '@/shared/hooks/use-toast'
import { downloadBeritaAcaraPdf } from '@/shared/print/download-berita-acara-pdf'
import { ApiError } from '@/shared/api/api-client'
import {
  printSopArsipFromPreviewProps,
  type PengajuanPrintTarget,
} from '@/shared/print/pengajuan-print'
import {
  mapBeritaAcaraTemplateProps,
  type MapBeritaAcaraPengajuanInput,
} from '@/features/submission/model/map-berita-acara-template-props'
import type { TTESignaturePayload } from '@/types/dto/tte.dto'

const WORKBENCH_LOGS_LIMIT = 100

interface UsePengajuanCetakArsipParams {
  pengajuanId: string
  pengajuan: MapBeritaAcaraPengajuanInput | null
  effectiveSopDetailId: string | null
  baTemplateProps: BeritaAcaraTemplateProps | null
  sopPreviewProps: SopPreviewWorkbenchProps | null
  tteSignaturePayload?: TTESignaturePayload | null
}

export function usePengajuanCetakArsip({
  pengajuanId,
  pengajuan,
  effectiveSopDetailId,
  baTemplateProps,
  sopPreviewProps,
  tteSignaturePayload = null,
}: UsePengajuanCetakArsipParams) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [cetakLoading, setCetakLoading] = useState(false)

  const prefetchBeritaAcaraArsip = useCallback(async () => {
    const data = await evaluasiApi.findPengajuanBeritaAcara(pengajuanId, { arsip: true })
    queryClient.setQueryData(queryKeys.evaluasiPengajuanBeritaAcara(pengajuanId), data)
    return data
  }, [pengajuanId, queryClient])

  const prefetchSopDokumenArsip = useCallback(
    async (detailSopId: string) => {
      const data = await evaluasiApi.findPengajuanSopDokumen(
        pengajuanId,
        detailSopId,
        WORKBENCH_LOGS_LIMIT,
        { arsip: true },
      )
      queryClient.setQueryData(
        queryKeys.evaluasiPengajuanSopDokumen(
          pengajuanId,
          detailSopId,
          WORKBENCH_LOGS_LIMIT,
        ),
        data,
      )
      return data
    },
    [pengajuanId, queryClient],
  )

  const handleCetak = useCallback(
    async (target: PengajuanPrintTarget) => {
      setCetakLoading(true)
      try {
        if (target === 'ba') {
          const baView = await prefetchBeritaAcaraArsip()
          const freshBaTemplateProps =
            pengajuan !== null
              ? mapBeritaAcaraTemplateProps({ pengajuan, baView })
              : baTemplateProps
          if (freshBaTemplateProps === null) {
            showToast('Data Berita Acara belum siap untuk diunduh.', 'error')
            return
          }
          await downloadBeritaAcaraPdf(freshBaTemplateProps)
          return
        }
        if (effectiveSopDetailId === null) {
          return
        }
        if (sopPreviewProps === null) {
          showToast('Data SOP belum siap untuk dicetak.', 'error')
          return
        }
        await prefetchSopDokumenArsip(effectiveSopDetailId)
        const pdfSigningStatus = await queryClient.fetchQuery({
          queryKey: queryKeys.ttePdfSigningStatus,
          queryFn: () => tteApi.getPdfSigningStatus(),
        })
        const { diagramExportFailed } = await printSopArsipFromPreviewProps(
          sopPreviewProps,
          tteSignaturePayload,
          {
            signPdf: pdfSigningStatus.enabled && Boolean(tteSignaturePayload),
          },
        )
        if (diagramExportFailed) {
          showToast(
            'Diagram tidak dapat diekspor; PDF dicetak dengan tabel langkah sebagai cadangan.',
            'error',
          )
        }
      } catch (err) {
        if (err instanceof ApiError) {
          showToast(err.message, 'error')
          return
        }
        const message =
          err instanceof Error ? err.message : 'Gagal memuat dokumen untuk dicetak'
        showToast(message, 'error')
      } finally {
        setCetakLoading(false)
      }
    },
    [
      baTemplateProps,
      effectiveSopDetailId,
      pengajuan,
      prefetchBeritaAcaraArsip,
      prefetchSopDokumenArsip,
      queryClient,
      showToast,
      sopPreviewProps,
      tteSignaturePayload,
    ],
  )

  return {
    handleCetak,
    cetakLoading,
  }
}

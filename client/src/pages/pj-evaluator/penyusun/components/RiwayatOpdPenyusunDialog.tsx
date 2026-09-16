/**
 * Dialog riwayat penempatan OPD - GET /api/v1/penyusun/:id/riwayat-opd
 */
import { useQuery } from '@tanstack/react-query'
import { RiwayatOpdDialog } from '@/features/organization/ui/riwayat-opd-dialog'
import { penyusunApi } from '@/features/organization/api/penyusun'
import { queryKeys } from '@/app/config/query-keys'
import { STALE_TIME } from '@/shared/lib/constants'

function formatTanggal(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export interface RiwayatOpdPenyusunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  penggunaId: string | null
  namaPenyusun: string
}

export function RiwayatOpdPenyusunDialog({
  open,
  onOpenChange,
  penggunaId,
  namaPenyusun,
}: RiwayatOpdPenyusunDialogProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.penyusunRiwayatOpd(penggunaId ?? ''),
    queryFn: () => penyusunApi.getRiwayatOpd(penggunaId!),
    enabled: open && penggunaId != null,
    staleTime: STALE_TIME.MEDIUM,
  })

  return (
    <RiwayatOpdDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Riwayat OPD - ${namaPenyusun}`}
      rows={data?.map((row) => ({
        id: row.opdId,
        namaOpd: row.namaOpd,
        isAktif: row.isAktif,
        primaryDateLabel: 'Pertama dicatat',
        primaryDate: formatTanggal(row.pertamaDicatat),
        secondaryDateLabel: 'Terakhir diperbarui',
        secondaryDate: formatTanggal(row.terakhirDiperbarui),
      }))}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Belum ada riwayat tercatat. Riwayat terisi saat penyusun baru ditambahkan atau dipindahkan ke OPD lain."
    />
  )
}

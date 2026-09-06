import { deriveTahapPenilaianSop } from './evaluasi-domain'
import type {
  EvaluasiWorkspaceOpdResponse,
  EvaluasiWorkspacePengajuanAktif,
  NilaiEvaluasi,
} from '@/types/dto/evaluasi.dto'

export interface EvaluasiWorkspaceFallbackPengajuan {
  id: string
  status: string
  statusLabel: string
  jenis: EvaluasiWorkspacePengajuanAktif['jenis']
  version: number
  alasanPenolakan: string | null
  tanggalDitolak: string | null
  nilaiEvaluasi: NilaiEvaluasi[]
}

export interface EvaluasiWorkspaceSopView {
  id: string
  judul: string
  nomorSOP: string
  status: string
  alur: EvaluasiWorkspaceOpdResponse['daftarSop'][number]['tampilanAlur']
}

export interface EvaluasiWorkspaceListItemView {
  id: string
  nama: string
  nomor: string
  statusDokumen: string
  statusDokumenLabel: string
  hasilEvaluasi: EvaluasiWorkspaceOpdResponse['daftarSop'][number]['hasilEvaluasi']
  hasilEvaluasiLabel: string
  statusTindakLanjut: EvaluasiWorkspaceOpdResponse['daftarSop'][number]['statusTindakLanjut']
  statusTindakLanjutLabel: string | null
  tahapPenilaian: ReturnType<typeof deriveTahapPenilaianSop>
}

export interface EvaluasiWorkspaceProjection {
  opd: { id: string; nama: string; kode: string } | null
  sops: EvaluasiWorkspaceSopView[]
  listItems: EvaluasiWorkspaceListItemView[]
  judulByDetailId: Map<string, { judul: string; nomorSOP: string }>
  riwayatOpd: Array<{
    tanggal: string
    evaluator: string
    nilaiOPD?: number
  }>
}

/**
 * Resolve pengajuan yang dipakai page. Workspace tetap sumber utama; fallback hanya
 * digunakan saat response workspace secara eksplisit membawa `pengajuanAktif: null`.
 */
export function resolveEvaluasiWorkspacePengajuanAktif(
  workspace: EvaluasiWorkspaceOpdResponse | undefined,
  fallback: EvaluasiWorkspaceFallbackPengajuan | null,
): EvaluasiWorkspacePengajuanAktif | null | undefined {
  if (workspace === undefined) return undefined
  if (workspace.pengajuanAktif !== null) return workspace.pengajuanAktif
  if (fallback === null) return null

  return {
    id: fallback.id,
    status: fallback.status,
    statusLabel: fallback.statusLabel ?? fallback.status,
    jenis: fallback.jenis ?? 'EVALUASI_REQUEST_EVALUATOR',
    version: fallback.version,
    alasanPenolakan: fallback.alasanPenolakan ?? null,
    tanggalDitolak: fallback.tanggalDitolak ?? null,
    nilaiPerDetail: fallback.nilaiEvaluasi.map((nilai) => {
      const hasil =
        nilai.hasil === 'SESUAI' ||
        nilai.hasil === 'PERLU_PERBAIKAN' ||
        nilai.hasil === 'DITOLAK'
          ? nilai.hasil
          : ('BELUM_DINILAI' as const)
      return {
        detailSopId: nilai.sopDetailId,
        hasil,
        hasilLabel:
          nilai.hasil === 'SESUAI'
            ? 'Sesuai'
            : nilai.hasil === 'PERLU_PERBAIKAN'
              ? 'Perlu perbaikan'
              : nilai.hasil === 'DITOLAK'
                ? 'Ditolak'
                : 'Belum dinilai',
        catatan: nilai.catatan ?? null,
        version: nilai.version,
        statusTindakLanjut: nilai.statusTindakLanjut ?? null,
        statusTindakLanjutLabel: nilai.statusTindakLanjutLabel ?? null,
        ditindaklanjutiPada: nilai.ditindaklanjutiPada ?? null,
        versi: 1,
        detailUpdatedAt: new Date(0).toISOString(),
      }
    }),
  }
}

/** Pure DTO -> page view-model projection; tidak memiliki local state atau side effect. */
export function adaptEvaluasiWorkspace(
  workspace: EvaluasiWorkspaceOpdResponse | undefined,
): EvaluasiWorkspaceProjection {
  if (!workspace) {
    return {
      opd: null,
      sops: [],
      listItems: [],
      judulByDetailId: new Map(),
      riwayatOpd: [],
    }
  }

  const sops: EvaluasiWorkspaceSopView[] = workspace.daftarSop.map((row) => ({
    id: row.detailSopId,
    judul: row.judul,
    nomorSOP: row.nomorSOP,
    status: row.statusDetail,
    alur: row.tampilanAlur,
  }))

  const listItems: EvaluasiWorkspaceListItemView[] = workspace.daftarSop.map((row) => ({
    id: row.detailSopId,
    nama: row.judul,
    nomor: row.nomorSOP,
    statusDokumen: row.statusDetail,
    statusDokumenLabel: row.statusDetailLabel,
    hasilEvaluasi: row.hasilEvaluasi,
    hasilEvaluasiLabel: row.hasilEvaluasiLabel,
    statusTindakLanjut: row.statusTindakLanjut ?? null,
    statusTindakLanjutLabel: row.statusTindakLanjutLabel ?? null,
    tahapPenilaian: deriveTahapPenilaianSop({
      hasil: row.hasilEvaluasi,
      statusTindakLanjut: row.statusTindakLanjut ?? null,
      statusDetail: row.statusDetail,
    }),
  }))

  const judulByDetailId = new Map<string, { judul: string; nomorSOP: string }>()
  for (const row of workspace.daftarSop) {
    judulByDetailId.set(row.detailSopId, {
      judul: row.judul,
      nomorSOP: row.nomorSOP,
    })
  }

  return {
    opd: {
      id: workspace.opd.id,
      nama: workspace.opd.nama,
      kode: workspace.opd.id,
    },
    sops,
    listItems,
    judulByDetailId,
    riwayatOpd: (workspace.riwayatOpd ?? []).map((row) => ({
      tanggal: row.tanggal,
      evaluator: row.evaluatorNama,
      ...(row.nilaiOPD == null ? {} : { nilaiOPD: row.nilaiOPD }),
    })),
  }
}

export function findEvaluasiWorkspaceNilaiSop(
  pengajuan: EvaluasiWorkspacePengajuanAktif | null | undefined,
  detailSopId: string | null,
) {
  if (!pengajuan || !detailSopId) return null
  return pengajuan.nilaiPerDetail.find((row) => row.detailSopId === detailSopId) ?? null
}

export function findEvaluasiWorkspaceNilaiOpd(
  workspace: EvaluasiWorkspaceOpdResponse | undefined,
  pengajuan: EvaluasiWorkspacePengajuanAktif | null | undefined,
): number | null {
  if (!workspace || !pengajuan) return null
  const riwayat = workspace.riwayatOpd.find(
    (row) => row.pengajuanEvaluasiId === pengajuan.id,
  )
  return riwayat?.nilaiOPD ?? null
}

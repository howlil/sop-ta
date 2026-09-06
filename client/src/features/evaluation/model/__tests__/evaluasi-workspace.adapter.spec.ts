import { describe, expect, it } from 'vitest'
import {
  adaptEvaluasiWorkspace,
  findEvaluasiWorkspaceNilaiOpd,
  resolveEvaluasiWorkspacePengajuanAktif,
  type EvaluasiWorkspaceFallbackPengajuan,
} from '../evaluasi-workspace.adapter'
import type {
  EvaluasiWorkspaceOpdResponse,
  EvaluasiWorkspacePengajuanAktif,
} from '@/types/dto/evaluasi.dto'

function activePengajuan(): EvaluasiWorkspacePengajuanAktif {
  return {
    id: 'pengajuan-workspace',
    status: 'SEDANG_DIEVALUASI',
    statusLabel: 'Sedang dievaluasi',
    jenis: 'EVALUASI_REQUEST_EVALUATOR',
    version: 4,
    alasanPenolakan: null,
    tanggalDitolak: null,
    nilaiPerDetail: [],
  }
}

function workspace(
  pengajuanAktif: EvaluasiWorkspacePengajuanAktif | null = activePengajuan(),
): EvaluasiWorkspaceOpdResponse {
  return {
    opd: { id: 'opd-1', nama: 'Biro Organisasi' },
    pengajuanAktif,
    daftarSop: [
      {
        detailSopId: 'detail-1',
        sopId: 'sop-1',
        judul: 'SOP Surat Masuk',
        nomorSOP: '001/SOP/2026',
        statusDetail: 'REVISI_DARI_EVALUATOR',
        statusDetailLabel: 'Perlu revisi',
        hasilEvaluasi: 'PERLU_PERBAIKAN',
        hasilEvaluasiLabel: 'Perlu perbaikan',
        tampilanAlur: 'sedang_dievaluasi',
        tampilanAlurLabel: 'Sedang dievaluasi',
        statusTindakLanjut: 'TERBUKA',
        statusTindakLanjutLabel: 'Menunggu tindak lanjut OPD',
        versi: 2,
        detailUpdatedAt: '2026-09-05T10:00:00.000Z',
        ditindaklanjutiPada: null,
        evaluatorTerakhir: { nama: 'Evaluator A', pada: '2026-09-05T09:00:00.000Z' },
      },
    ],
    riwayatOpd: [
      {
        tanggal: '2026-09-04T00:00:00.000Z',
        evaluatorNama: 'Evaluator A',
        nilaiOPD: 4,
        pengajuanEvaluasiId: 'pengajuan-workspace',
      },
    ],
    preview: null,
    logNilaiSopTerpilih: [],
  }
}

function fallback(): EvaluasiWorkspaceFallbackPengajuan {
  return {
    id: 'pengajuan-fallback',
    status: 'SEDANG_DIEVALUASI',
    statusLabel: 'Sedang dievaluasi',
    jenis: 'EVALUASI_REQUEST_EVALUATOR',
    version: 2,
    alasanPenolakan: null,
    tanggalDitolak: null,
    nilaiEvaluasi: [
      {
        id: 'nilai-1',
        pengajuanEvaluasiId: 'pengajuan-fallback',
        sopDetailId: 'detail-1',
        version: 3,
        statusTindakLanjut: 'SELESAI',
        statusTindakLanjutLabel: 'Siap dinilai ulang',
        ditindaklanjutiPada: '2026-09-05T11:00:00.000Z',
        createdAt: '2026-09-05T08:00:00.000Z',
        updatedAt: '2026-09-05T11:00:00.000Z',
      },
    ],
  }
}

describe('evaluasi-workspace.adapter', () => {
  it('mengutamakan pengajuan aktif yang sudah dikirim workspace', () => {
    const current = activePengajuan()
    expect(resolveEvaluasiWorkspacePengajuanAktif(workspace(current), fallback())).toBe(current)
  })

  it('memproyeksikan fallback dengan default yang sama seperti page lama', () => {
    const resolved = resolveEvaluasiWorkspacePengajuanAktif(workspace(null), fallback())

    expect(resolved?.id).toBe('pengajuan-fallback')
    expect(resolved?.nilaiPerDetail[0]).toMatchObject({
      detailSopId: 'detail-1',
      hasil: 'BELUM_DINILAI',
      hasilLabel: 'Belum dinilai',
      statusTindakLanjut: 'SELESAI',
      statusTindakLanjutLabel: 'Siap dinilai ulang',
      ditindaklanjutiPada: null,
      versi: 1,
      detailUpdatedAt: new Date(0).toISOString(),
    })
  })

  it('memetakan DTO workspace ke view-model daftar tanpa mengubah tahap penilaian', () => {
    const projection = adaptEvaluasiWorkspace(workspace())

    expect(projection.opd).toEqual({
      id: 'opd-1',
      nama: 'Biro Organisasi',
      kode: 'opd-1',
    })
    expect(projection.sops[0]).toMatchObject({
      id: 'detail-1',
      judul: 'SOP Surat Masuk',
      nomorSOP: '001/SOP/2026',
    })
    expect(projection.listItems[0]).toMatchObject({
      id: 'detail-1',
      hasilEvaluasi: 'PERLU_PERBAIKAN',
      statusTindakLanjut: 'TERBUKA',
      tahapPenilaian: 'menunggu_perbaikan_opd',
    })
    expect(projection.judulByDetailId.get('detail-1')).toEqual({
      judul: 'SOP Surat Masuk',
      nomorSOP: '001/SOP/2026',
    })
  })

  it('mengambil skor OPD hanya dari riwayat pengajuan yang sedang dipakai', () => {
    expect(findEvaluasiWorkspaceNilaiOpd(workspace(), activePengajuan())).toBe(4)
    expect(
      findEvaluasiWorkspaceNilaiOpd(workspace(), {
        ...activePengajuan(),
        id: 'pengajuan-lain',
      }),
    ).toBeNull()
  })
})

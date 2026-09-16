import { expect, test, type APIRequestContext } from '@playwright/test'

import { users } from './fixtures/users'
import {
  apiGet,
  apiPatch,
  apiPost,
  createAuthenticatedApiContext,
  expectBackendAvailable,
  toApiUrl,
  unwrapApiData,
} from './support/api'
import { createDraftSopFixture } from './support/e2e-flow'

interface Workbench {
  detail: {
    id: string
    judul?: string
    namaLembaga?: string
    prosedurRevision: number
    diagramRevision: number
    lampiran?: {
      peringatan: Array<{ teks: string }>
      kualifikasiPelaksanaan: Array<{ teks: string }>
      peralatanPerlengkapan: Array<{ teks: string }>
      pencatatanPendataan: Array<{ teks: string }>
    }
  }
  langkah: Array<{
    kegiatan: string
    kelengkapan: string
    keluaran: string
    keterangan: string
  }>
  logEdit: Array<{
    bagian: string
    user?: { email: string }
    meta?: { fields?: string[] }
  }>
}

interface Pelaksana {
  id: string
}

test.describe('Concurrency editing SOP realtime/autosave', () => {
  test.beforeEach(async ({ request }) => {
    await expectBackendAvailable(request)
  })

  test('CONC-01: autosave header paralel pada field berbeda tidak menghilangkan perubahan', async () => {
    const penyusun = await createAuthenticatedApiContext(users.penyusun)
    const pjPenyusun = await createAuthenticatedApiContext(users.pjPenyusun)
    try {
      const draft = await createDraftSopFixture(penyusun, 'CONC-HDR')
      const namaLembaga = `Biro Organisasi Sumbar - ${Date.now()}`
      const peringatan = `Peringatan concurrency ${Date.now()}`

      const [responseA, responseB] = await Promise.all([
        apiPatch<Workbench>(penyusun, `/sop/header/${draft.detailSopId}`, {
          namaLembaga,
        }),
        apiPatch<Workbench>(pjPenyusun, `/sop/header/${draft.detailSopId}`, {
          lampiran: {
            peringatan: [peringatan],
          },
        }),
      ])

      expect(responseA.detail.id).toBe(draft.detailSopId)
      expect(responseB.detail.id).toBe(draft.detailSopId)

      const finalWorkbench = await apiGet<Workbench>(
        penyusun,
        `/sop/penyusun-workbench/${draft.detailSopId}`,
      )
      expect(finalWorkbench.detail.namaLembaga).toBe(namaLembaga)
      expect(finalWorkbench.detail.lampiran?.peringatan.map((item) => item.teks)).toContain(
        peringatan,
      )
      expect(finalWorkbench.logEdit.some((log) => log.bagian === 'HEADER')).toBe(true)
    } finally {
      await disposeAll(penyusun, pjPenyusun)
    }
  })

  test('CONC-02: autosave prosedur stale ditolak 409 dan tidak dapat menimpa winner', async () => {
    const penyusun = await createAuthenticatedApiContext(users.penyusun)
    const pjPenyusun = await createAuthenticatedApiContext(users.pjPenyusun)
    try {
      const draft = await createDraftSopFixture(penyusun, 'CONC-STEP')
      const initialWorkbench = await apiGet<Workbench>(
        penyusun,
        `/sop/penyusun-workbench/${draft.detailSopId}`,
      )
      const pelaksana = await apiPost<Pelaksana>(penyusun, '/pelaksana', {
        namaPelaksana: `Pelaksana concurrency ${Date.now()}`,
      })
      const expectedRevision = initialWorkbench.detail.prosedurRevision
      const payloadA = { ...buildLangkahPayload(pelaksana.id, 'A'), expectedRevision }
      const payloadB = { ...buildLangkahPayload(pelaksana.id, 'B'), expectedRevision }
      const endpoint = toApiUrl(`/sop/langkah/${draft.detailSopId}`)

      const [responseA, responseB] = await Promise.all([
        penyusun.patch(endpoint, { data: payloadA }),
        pjPenyusun.patch(endpoint, { data: payloadB }),
      ])

      expect([responseA.status(), responseB.status()].sort((a, b) => a - b)).toEqual([200, 409])

      const winnerResponse = responseA.ok() ? responseA : responseB
      const conflictResponse = responseA.status() === 409 ? responseA : responseB
      const winner = unwrapApiData<Workbench>(await winnerResponse.json())
      const conflict = (await conflictResponse.json()) as {
        statusCode?: number
        code?: string
        section?: string
      }

      expect(conflict.statusCode).toBe(409)
      expect(conflict.code).toBe('SOP_EDIT_CONFLICT')
      expect(conflict.section).toBe('PROSEDUR')
      expect(winner.detail.prosedurRevision).toBe(expectedRevision + 1)

      const finalWorkbench = await apiGet<Workbench>(
        penyusun,
        `/sop/penyusun-workbench/${draft.detailSopId}`,
      )
      expect(finalWorkbench.detail.prosedurRevision).toBe(expectedRevision + 1)
      expect(finalWorkbench.langkah.map((step) => step.kegiatan)).toEqual(
        winner.langkah.map((step) => step.kegiatan),
      )
      expect(finalWorkbench.langkah).toHaveLength(2)
      expect(finalWorkbench.logEdit.some((log) => log.bagian === 'LANGKAH')).toBe(true)
    } finally {
      await disposeAll(penyusun, pjPenyusun)
    }
  })
})

function buildLangkahPayload(pelaksanaId: string, marker: string) {
  return {
    pelaksana: [{ pelaksanaId }],
    langkah: [
      {
        tempId: `${marker}-mulai`,
        jenis: 'AWAL_AKHIR',
        kegiatan: `Mulai ${marker}`,
        kelengkapan: `Berkas awal ${marker}`,
        keluaran: `Dokumen diterima ${marker}`,
        keterangan: `Awal concurrency ${marker}`,
        waktu: 5,
        satuanWaktu: 'm',
        pelaksanaId,
      },
      {
        tempId: `${marker}-selesai`,
        jenis: 'AWAL_AKHIR',
        kegiatan: `Selesai ${marker}`,
        kelengkapan: `Berkas akhir ${marker}`,
        keluaran: `Dokumen selesai ${marker}`,
        keterangan: `Akhir concurrency ${marker}`,
        waktu: 5,
        satuanWaktu: 'm',
        pelaksanaId,
      },
    ],
  } as const
}

async function disposeAll(...contexts: APIRequestContext[]): Promise<void> {
  await Promise.all(contexts.map((context) => context.dispose()))
}

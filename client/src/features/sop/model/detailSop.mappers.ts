import type {
  JenisLangkahProsedur,
  LangkahSOP,
  PenyusunWorkbenchData,
  PenyusunWorkbenchDiagramKonfigurasi,
  SopDetail,
} from "@/types/dto/sop.dto";
import type { ProsedurRow, SOPDetailMetadata } from "@/types/ui/sop";
import { SOP_INSTITUTION_LOGO_URL } from "@/lib/sop/sop-institution-logo";

const API_JENIS_TO_ROW_TYPE: Record<JenisLangkahProsedur, ProsedurRow["type"]> = {
  AWAL_AKHIR: "terminator",
  KEGIATAN: "task",
  KEPUTUSAN: "decision",
};

/** Memecah `namaLembaga` API (boleh multi-baris) jadi maks. 4 baris untuk header SOP. */
export function namaLembagaToInstitutionLines(namaLembaga: string | undefined | null): string[] {
  if (namaLembaga == null || namaLembaga.trim() === "") {
    return [];
  }
  return namaLembaga
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 4);
}

/** Adapter boundary: API SopDetail -> canonical editor metadata. */
export function transformSopDetailToMetadata(detail: SopDetail): SOPDetailMetadata {
  const dasarHukumPeraturanIds =
    detail.dasarHukumPeraturanIds ??
    detail.dasarHukum?.map((d) => d.id.includes("-") ? d.id.split("-").slice(-1)[0] : d.id) ??
    [];
  const dasarHukum =
    detail.dasarHukum?.map((d) => `${d.nomor}/${d.tahun} tentang ${d.judul}`) ?? [];
  const sopTerkaitDetailIds =
    detail.sopTerkaitDetailIds ??
    detail.relasiSopKeluar?.map((rel) => rel.sopTerkaitId) ??
    [];
  const sopTerkait =
    detail.relasiSopKeluar
      ?.map((rel) => {
        const nested = rel.sopTerkait as { sop?: { judul?: string } } | undefined;
        return nested?.sop?.judul ?? "";
      })
      .filter((judul) => judul.length > 0) ?? [];

  return {
    id: detail.id,
    sopId: detail.sopId,
    nomorSOP: detail.nomorSOP,
    judul: detail.sop?.judul ?? "",
    namaLembaga: detail.namaLembaga ?? "",
    logoUrl: SOP_INSTITUTION_LOGO_URL,
    tanggalPembuatan: detail.tanggalPembuatan,
    tanggalEfektif: detail.tanggalEfektif ?? "",
    tanggalRevisi: detail.tanggalRevisi ?? "",
    version: detail.versi,
    revisiDariDetailSopId: detail.revisiDariDetailSopId ?? null,
    revisiDariVersi: detail.revisiDariVersi ?? null,
    kepalaOpdNama: detail.kepalaOpd?.nama?.trim() ?? "",
    kepalaOpdNip: detail.kepalaOpd?.nip?.trim() ?? "",
    dasarHukum,
    dasarHukumPeraturanIds,
    sopTerkait,
    sopTerkaitDetailIds,
    peringatan: (detail.lampiran?.peringatan ?? []).map((item) => item.teks),
    kualifikasiPelaksanaan: (detail.lampiran?.kualifikasiPelaksanaan ?? []).map((item) => item.teks),
    peralatanPerlengkapan: (detail.lampiran?.peralatanPerlengkapan ?? []).map((item) => item.teks),
    pencatatanPendataan: (detail.lampiran?.pencatatanPendataan ?? []).map((item) => item.teks),
  };
}

/** Adapter boundary: API LangkahSOP -> canonical editor procedure row. */
export function transformLangkahToProsedurRow(langkah: LangkahSOP): ProsedurRow {
  const waktu = Number.isFinite(langkah.waktu) ? Math.max(0, langkah.waktu) : 0;
  return {
    id: langkah.id,
    urutan: langkah.urutan,
    kegiatan: langkah.kegiatan,
    pelaksana: langkah.pelaksanaId,
    waktu,
    satuanWaktu: langkah.satuanWaktu,
    kelengkapan: langkah.kelengkapan,
    keluaran: langkah.keluaran,
    type: API_JENIS_TO_ROW_TYPE[langkah.jenis] ?? "task",
    id_next_step_if_yes: langkah.langkahSelanjutnyaYaId ?? undefined,
    id_next_step_if_no: langkah.langkahSelanjutnyaTidakId ?? undefined,
    keterangan: langkah.keterangan ?? "",
    pelaksanaMapping: langkah.pelaksanaId ? { [langkah.pelaksanaId]: '√' } : {},
  };
}

/** Memetakan payload workbench API ke props pratinjau dokumen (SOPPreviewTemplate). */
export function mapPenyusunWorkbenchToPreviewProps(data: PenyusunWorkbenchData): {
  metadata: SOPDetailMetadata;
  prosedurRows: ProsedurRow[];
  implementers: { id: string; name: string }[];
  name?: string;
  number?: string;
  diagramKonfigurasi?: PenyusunWorkbenchDiagramKonfigurasi;
} {
  const detail = data.detail as SopDetail;
  const metadata = transformSopDetailToMetadata(detail);
  const prosedurRows = data.langkah.map((step) =>
    transformLangkahToProsedurRow(step as LangkahSOP),
  );
  const lanes = [...(detail.swimlanes ?? [])].sort((a, b) => a.urutan - b.urutan);
  const implementers = lanes.map((lane) => ({
    id: lane.pelaksanaId,
    name: lane.pelaksana?.namaPelaksana ?? lane.pelaksanaId,
  }));
  return {
    name: detail.sop?.judul,
    number: detail.nomorSOP,
    metadata,
    prosedurRows,
    implementers,
    diagramKonfigurasi: data.diagramKonfigurasi,
  };
}

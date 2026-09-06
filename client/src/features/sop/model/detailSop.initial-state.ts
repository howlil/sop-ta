import type { PelaksanaRow, SOPDetailMetadata } from "@/types/ui/sop";

export function getInitialSopDetailMetadata(): SOPDetailMetadata {
  return {
    id: "",
    nomorSOP: "",
    judul: "",
    namaLembaga: "",
    logoUrl: "",
    tanggalEfektif: "",
    tanggalRevisi: "",
    tanggalPembuatan: "",
    kepalaOpdNama: "",
    kepalaOpdNip: "",
    dasarHukum: [],
    dasarHukumPeraturanIds: [],
    sopTerkait: [],
    sopTerkaitDetailIds: [],
    peringatan: [],
    kualifikasiPelaksanaan: [],
    peralatanPerlengkapan: [],
    pencatatanPendataan: [],
  };
}

export function getInitialSopDetailImplementers(): PelaksanaRow[] {
  return [];
}

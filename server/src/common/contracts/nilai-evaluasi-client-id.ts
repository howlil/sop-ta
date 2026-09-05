/** Identifier stabil lintas SOP/Evaluation untuk muatan JSON (bukan kolom DB). */
export function buildNilaiEvaluasiClientId(
  pengajuanEvaluasiId: string,
  detailSopId: string,
): string {
  return `${pengajuanEvaluasiId}:${detailSopId}`;
}

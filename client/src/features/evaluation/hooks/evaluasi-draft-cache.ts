import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/config/query-keys";
import { STATUS_HASIL_EVALUASI } from "@/types/dto/evaluasi.dto";
import type {
  EvaluasiWorkspaceOpdResponse,
  NilaiEvaluasi,
  PengajuanEvaluasi,
  StatusHasilEvaluasi,
} from "@/types/dto/evaluasi.dto";
import { invalidateSopEvaluasiWorkflow } from "@/lib/api/cache-invalidation";

export interface SaveDraftMutationVariables {
  pengajuanId: string;
  sopDetailId: string;
  status: StatusHasilEvaluasi;
  komentar: string;
  version: number;
  signature: string;
}

function getHasilEvaluasiLabel(hasil: StatusHasilEvaluasi): string {
  return hasil === STATUS_HASIL_EVALUASI.SESUAI ? "Sesuai" : "Perlu perbaikan";
}

function updatePengajuanEvaluasiListCache(
  list: PengajuanEvaluasi[] | undefined,
  savedNilai: NilaiEvaluasi,
  variables: SaveDraftMutationVariables,
): PengajuanEvaluasi[] | undefined {
  if (!list) return list;

  return list.map((pengajuan) => {
    if (pengajuan.id !== variables.pengajuanId) return pengajuan;

    const nilaiEvaluasi = pengajuan.nilaiEvaluasi ?? [];
    const hasExistingNilai = nilaiEvaluasi.some(
      (nilai) => nilai.sopDetailId === variables.sopDetailId,
    );

    return {
      ...pengajuan,
      nilaiEvaluasi: hasExistingNilai
        ? nilaiEvaluasi.map((nilai) =>
            nilai.sopDetailId === variables.sopDetailId ? savedNilai : nilai,
          )
        : [...nilaiEvaluasi, savedNilai],
    };
  });
}

function updateWorkspaceEvaluasiCache(
  workspace: EvaluasiWorkspaceOpdResponse | undefined,
  savedNilai: NilaiEvaluasi,
  variables: SaveDraftMutationVariables,
): EvaluasiWorkspaceOpdResponse | undefined {
  if (!workspace || workspace.pengajuanAktif?.id !== variables.pengajuanId) {
    return workspace;
  }

  const hasil =
    savedNilai.hasil === STATUS_HASIL_EVALUASI.SESUAI ||
    savedNilai.hasil === STATUS_HASIL_EVALUASI.PERLU_PERBAIKAN
      ? savedNilai.hasil
      : variables.status;
  const catatan = savedNilai.catatan ?? variables.komentar;
  const hasilLabel = getHasilEvaluasiLabel(hasil);

  return {
    ...workspace,
    pengajuanAktif: {
      ...workspace.pengajuanAktif,
      nilaiPerDetail: workspace.pengajuanAktif.nilaiPerDetail.map((nilai) =>
        nilai.detailSopId === variables.sopDetailId
          ? {
              ...nilai,
              hasil,
              hasilLabel,
              catatan,
              version: savedNilai.version,
              statusTindakLanjut:
                savedNilai.statusTindakLanjut ?? nilai.statusTindakLanjut,
              statusTindakLanjutLabel:
                savedNilai.statusTindakLanjutLabel ??
                nilai.statusTindakLanjutLabel,
              ditindaklanjutiPada:
                savedNilai.ditindaklanjutiPada ?? nilai.ditindaklanjutiPada,
            }
          : nilai,
      ),
    },
    daftarSop: workspace.daftarSop.map((row) =>
      row.detailSopId === variables.sopDetailId
        ? {
            ...row,
            hasilEvaluasi: hasil,
            hasilEvaluasiLabel: hasilLabel,
            statusTindakLanjut:
              savedNilai.statusTindakLanjut ?? row.statusTindakLanjut,
            statusTindakLanjutLabel:
              savedNilai.statusTindakLanjutLabel ??
              row.statusTindakLanjutLabel,
            ditindaklanjutiPada:
              savedNilai.ditindaklanjutiPada ?? row.ditindaklanjutiPada,
          }
        : row,
    ),
  };
}

export async function syncDraftEvaluasiCache(
  queryClient: QueryClient,
  savedNilai: NilaiEvaluasi,
  variables: SaveDraftMutationVariables,
): Promise<void> {
  queryClient.setQueriesData<PengajuanEvaluasi[]>(
    {
      predicate: (query) =>
        query.queryKey[0] === "evaluasi" && query.queryKey[1] === "list",
    },
    (list) => updatePengajuanEvaluasiListCache(list, savedNilai, variables),
  );
  queryClient.setQueriesData<EvaluasiWorkspaceOpdResponse>(
    { queryKey: queryKeys.evaluasiWorkspaceOpdAll },
    (workspace) => updateWorkspaceEvaluasiCache(workspace, savedNilai, variables),
  );
  queryClient.setQueriesData<EvaluasiWorkspaceOpdResponse>(
    { queryKey: queryKeys.evaluasiWorkspaceOpdSayaAll },
    (workspace) => updateWorkspaceEvaluasiCache(workspace, savedNilai, variables),
  );
  queryClient.setQueriesData<EvaluasiWorkspaceOpdResponse>(
    { queryKey: queryKeys.evaluasiWorkspacePengajuanAll },
    (workspace) => updateWorkspaceEvaluasiCache(workspace, savedNilai, variables),
  );
  await invalidateSopEvaluasiWorkflow(queryClient);
}

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { showErrorMessages, useToast } from "@/hooks/useToast";
import { evaluasiApi } from "@/features/evaluation/api/client";
import type { SelesaiEvaluasiDto } from "@/types/dto/evaluasi.dto";
import { assertCanMutateEvaluasiNilai } from "@/features/evaluation/model/evaluasi-permissions";
import { useAuthStore } from "@/stores/authStore";
import { invalidateSopEvaluasiWorkflow } from "@/lib/api/cache-invalidation";

interface UseEvaluasiSubmitConfig {
  pengajuanAktifId: string | undefined;
  ratingOPD: number | null;
  /** false untuk pengajuan EVALUASI_REQUEST_OPD — PATCH selesai tanpa nilaiOPD. */
  requiresNilaiOpd: boolean;
  canSubmit: boolean;
  blockingMessage: string | null;
  onSuccess?: () => void;
}

export function useEvaluasiSubmit(config: UseEvaluasiSubmitConfig) {
  const {
    pengajuanAktifId,
    ratingOPD,
    requiresNilaiOpd,
    canSubmit,
    blockingMessage,
    onSuccess,
  } = config;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluasiSubmitError, setEvaluasiSubmitError] = useState<
    string | null
  >(null);

  const clearEvaluasiSubmitError = useCallback(() => {
    setEvaluasiSubmitError(null);
  }, []);

  const handleSubmitAll = useCallback(
    async (nomorBA: string) => {
      if (!pengajuanAktifId) {
        setEvaluasiSubmitError("Pengajuan evaluasi tidak tersedia.");
        return;
      }
      if (!canSubmit) {
        setEvaluasiSubmitError(
          blockingMessage ?? "Syarat pengajuan belum terpenuhi.",
        );
        return;
      }
      if (requiresNilaiOpd && (ratingOPD === null || ratingOPD < 1 || ratingOPD > 5)) {
        setEvaluasiSubmitError("Isi skor evaluasi OPD (1–5) di tab Evaluasi OPD.");
        return;
      }
      setIsSubmitting(true);
      setEvaluasiSubmitError(null);
      try {
        assertCanMutateEvaluasiNilai(useAuthStore.getState().user?.peran);
        const payload: SelesaiEvaluasiDto = requiresNilaiOpd
          ? { nomorBA, nilaiOPD: ratingOPD! }
          : { nomorBA };
        await evaluasiApi.selesai(pengajuanAktifId, payload);
        await invalidateSopEvaluasiWorkflow(queryClient);
        showToast("Berita Acara berhasil diajukan ke PJ Evaluator", "success");
        onSuccess?.();
      } catch (error) {
        const err = error as Error;
        const message = err.message || "Gagal mengajukan Berita Acara";
        setEvaluasiSubmitError(message);
        showErrorMessages(error, message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      pengajuanAktifId,
      ratingOPD,
      requiresNilaiOpd,
      canSubmit,
      blockingMessage,
      queryClient,
      showToast,
      onSuccess,
    ],
  );

  return {
    isSubmitting,
    handleSubmitAll,
    evaluasiSubmitError,
    clearEvaluasiSubmitError,
  };
}

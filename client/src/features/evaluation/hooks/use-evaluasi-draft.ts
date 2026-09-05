import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showErrorMessages } from "@/hooks/useToast";
import { evaluasiApi } from "@/features/evaluation/api/client";
import { STATUS_HASIL_EVALUASI } from "@/types/dto/evaluasi.dto";
import type {
  EvaluasiWorkspacePengajuanAktif,
  StatusHasilEvaluasi,
} from "@/types/dto/evaluasi.dto";
import { usePengajuanEvaluasiAktif } from "@/features/evaluation/hooks/evaluasi-derived-hooks";
import type { TahapPenilaianSop } from "@/features/evaluation/model/evaluasi-domain";
import { assertCanMutateEvaluasiNilai } from "@/features/evaluation/model/evaluasi-permissions";
import { useAuthStore } from "@/stores/authStore";
import {
  syncDraftEvaluasiCache,
  type SaveDraftMutationVariables,
} from "@/features/evaluation/hooks/evaluasi-draft-cache";

const AUTO_SAVE_DELAY_MS = 1500;

export interface UseEvaluasiDraftReturn {
  statusEvaluasi: StatusHasilEvaluasi | null;
  setStatusEvaluasi: (status: StatusHasilEvaluasi | null) => void;
  komentarEvaluasi: string;
  setKomentarEvaluasi: (komentar: string) => void;
  saveDraft: () => void;
  clearDraft: () => void;
  isSaving: boolean;
  error: Error | null;
}

export function useEvaluasiDraft(
  opdId?: string,
  sopId?: string,
  workspacePengajuanAktif?: EvaluasiWorkspacePengajuanAktif | null,
  readOnly = false,
  tahapPenilaian?: TahapPenilaianSop,
): UseEvaluasiDraftReturn {
  const queryClient = useQueryClient();
  const {
    pengajuanId,
    pengajuan,
    isLoading: isLoadingPengajuan,
    getCurrentVersion,
  } = usePengajuanEvaluasiAktif(opdId, workspacePengajuanAktif);

  const sopDetailId = useMemo(() => {
    if (!pengajuan || !sopId) return null;
    const sopInPengajuan = pengajuan.nilaiEvaluasi?.find(
      (n) => n.sopDetail?.id === sopId,
    );
    const sopInList = pengajuan.nilaiEvaluasi?.find(
      (n) => n.sopDetailId === sopId,
    );
    return sopInPengajuan?.sopDetailId ?? sopInList?.sopDetailId ?? null;
  }, [pengajuan, sopId]);

  const existingNilai = useMemo(() => {
    if (!pengajuan || !sopDetailId) return null;
    return (
      pengajuan.nilaiEvaluasi?.find((n) => n.sopDetailId === sopDetailId) ??
      null
    );
  }, [pengajuan, sopDetailId]);

  const existingHasilEditable =
    existingNilai?.hasil === STATUS_HASIL_EVALUASI.SESUAI ||
    existingNilai?.hasil === STATUS_HASIL_EVALUASI.PERLU_PERBAIKAN
      ? existingNilai.hasil
      : null;

  const [statusEvaluasi, setStatusEvaluasiState] =
    useState<StatusHasilEvaluasi | null>(existingHasilEditable);
  const [komentarEvaluasi, setKomentarEvaluasiState] = useState<string>(
    existingNilai?.catatan ?? "",
  );

  const isTinjauanUlang = tahapPenilaian === "tinjauan_ulang";
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSubmittedRef = useRef<string | null>(null);
  const inFlightSignatureRef = useRef<string | null>(null);
  const serverDraftRef = useRef<{
    sopDetailId: string | null;
    status: StatusHasilEvaluasi | null;
    komentar: string;
  } | null>(null);

  useEffect(() => {
    const nextServerDraft = {
      sopDetailId,
      status: isTinjauanUlang ? null : existingHasilEditable,
      komentar: isTinjauanUlang ? "" : (existingNilai?.catatan ?? ""),
    };
    const previousServerDraft = serverDraftRef.current;
    const isDifferentDetail =
      previousServerDraft?.sopDetailId !== nextServerDraft.sopDetailId;
    const localMatchesPreviousServer =
      previousServerDraft == null ||
      (statusEvaluasi === previousServerDraft.status &&
        komentarEvaluasi === previousServerDraft.komentar);

    serverDraftRef.current = nextServerDraft;

    if (isTinjauanUlang) {
      if (statusEvaluasi !== null) setStatusEvaluasiState(null);
      if (komentarEvaluasi !== "") setKomentarEvaluasiState("");
      lastSubmittedRef.current = null;
      inFlightSignatureRef.current = null;
      return;
    }

    if (!isDifferentDetail && !localMatchesPreviousServer) {
      return;
    }
    if (isDifferentDetail) {
      lastSubmittedRef.current = null;
      inFlightSignatureRef.current = null;
    }
    if (statusEvaluasi !== nextServerDraft.status) {
      setStatusEvaluasiState(nextServerDraft.status);
    }
    if (komentarEvaluasi !== nextServerDraft.komentar) {
      setKomentarEvaluasiState(nextServerDraft.komentar);
    }
  }, [
    existingHasilEditable,
    existingNilai?.catatan,
    sopDetailId,
    isTinjauanUlang,
    statusEvaluasi,
    komentarEvaluasi,
  ]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const saveDraftMutation = useMutation({
    mutationFn: async ({
      pengajuanId: currentPengajuanId,
      sopDetailId: currentSopDetailId,
      status,
      komentar,
      version,
    }: SaveDraftMutationVariables) => {
      assertCanMutateEvaluasiNilai(useAuthStore.getState().user?.peran);

      return evaluasiApi.isiNilai(currentPengajuanId, currentSopDetailId, {
        hasil: status,
        catatan: komentar,
        version,
      });
    },
    onSuccess: async (savedNilai, variables) => {
      await syncDraftEvaluasiCache(queryClient, savedNilai, variables);
      lastSubmittedRef.current = variables.signature;
      if (inFlightSignatureRef.current === variables.signature) {
        inFlightSignatureRef.current = null;
      }
    },
    onError: (error, variables) => {
      if (lastSubmittedRef.current === variables.signature) {
        lastSubmittedRef.current = null;
      }
      if (inFlightSignatureRef.current === variables.signature) {
        inFlightSignatureRef.current = null;
      }
      showErrorMessages(error, "Gagal menyimpan draft evaluasi");
    },
  });

  const { mutate: mutateSaveDraft } = saveDraftMutation;

  const submitDraft = useCallback(
    (status: StatusHasilEvaluasi, komentar: string) => {
      if (!pengajuanId || !sopDetailId) {
        return;
      }

      const version = getCurrentVersion(sopDetailId);
      const signature = JSON.stringify({
        sopDetailId,
        status,
        komentar: komentar.trim(),
        version,
      });
      if (lastSubmittedRef.current === signature || inFlightSignatureRef.current) {
        return;
      }

      inFlightSignatureRef.current = signature;
      mutateSaveDraft({
        pengajuanId,
        sopDetailId,
        status,
        komentar,
        version,
        signature,
      });
    },
    [getCurrentVersion, mutateSaveDraft, pengajuanId, sopDetailId],
  );

  const {
    isPending: isSavingDraft,
    error: saveDraftError,
  } = saveDraftMutation;

  useEffect(() => {
    if (!isSavingDraft && inFlightSignatureRef.current) {
      inFlightSignatureRef.current = null;
    }
  }, [isSavingDraft]);

  useEffect(() => {
    if (!pengajuanId || !sopDetailId) {
      inFlightSignatureRef.current = null;
    }
  }, [pengajuanId, sopDetailId]);

  useEffect(() => {
    if (!saveDraftError) {
      return;
    }
    lastSubmittedRef.current = null;
  });

  const triggerAutoSave = useCallback(() => {
    if (readOnly) {
      return;
    }
    if (!pengajuanId || !sopDetailId || isLoadingPengajuan) {
      return;
    }
    if (statusEvaluasi == null) return;
    if (
      statusEvaluasi === STATUS_HASIL_EVALUASI.PERLU_PERBAIKAN &&
      komentarEvaluasi.trim().length === 0
    ) {
      return;
    }

    const existingHasil = isTinjauanUlang
      ? null
      : (existingNilai?.hasil ?? null);
    const existingCatatan = isTinjauanUlang
      ? ""
      : (existingNilai?.catatan ?? "").trim();
    if (
      statusEvaluasi === existingHasil &&
      komentarEvaluasi.trim() === existingCatatan
    ) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const currentStatus = statusEvaluasi;
    const currentKomentar = komentarEvaluasi;

    autoSaveTimerRef.current = setTimeout(() => {
      submitDraft(currentStatus, currentKomentar);
    }, AUTO_SAVE_DELAY_MS);
  }, [
    readOnly,
    pengajuanId,
    sopDetailId,
    isLoadingPengajuan,
    statusEvaluasi,
    komentarEvaluasi,
    submitDraft,
    existingNilai?.hasil,
    existingNilai?.catatan,
    isTinjauanUlang,
  ]);

  const setStatusEvaluasi = useCallback((status: StatusHasilEvaluasi | null) => {
    setStatusEvaluasiState(status);
  }, []);

  const setKomentarEvaluasi = useCallback((komentar: string) => {
    setKomentarEvaluasiState(komentar);
  }, []);

  useEffect(() => {
    triggerAutoSave();
  }, [triggerAutoSave]);

  const saveDraft = useCallback(() => {
    if (readOnly) {
      return;
    }
    if (!pengajuanId || !sopDetailId || statusEvaluasi == null) {
      return;
    }
    if (
      statusEvaluasi === STATUS_HASIL_EVALUASI.PERLU_PERBAIKAN &&
      komentarEvaluasi.trim().length === 0
    ) {
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    submitDraft(statusEvaluasi, komentarEvaluasi);
  }, [
    readOnly,
    pengajuanId,
    sopDetailId,
    statusEvaluasi,
    komentarEvaluasi,
    submitDraft,
  ]);

  const clearDraft = useCallback(() => {
    setStatusEvaluasiState(null);
    setKomentarEvaluasiState("");
    lastSubmittedRef.current = null;
    inFlightSignatureRef.current = null;
  }, []);

  return {
    statusEvaluasi,
    setStatusEvaluasi,
    komentarEvaluasi,
    setKomentarEvaluasi,
    saveDraft,
    clearDraft,
    isSaving: isSavingDraft,
    error: saveDraftError,
  };
}

import { useCallback } from 'react'
import type { NavigateOptions } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/config/query-keys'
import { useMutationWithToast } from '@/hooks/useMutationWithToast'
import { sopApi } from '@/api/sop-client'
import { ROUTES } from '@/utils/constants'
import { SOP_EVALUASI_WORKFLOW_QUERY_KEYS } from '@/lib/api/cache-invalidation'
import { getKirimUlangRoleBlockingReason } from '@/lib/sop/sop-permissions'
import type { UpdateStatusDto } from '@/types/dto/sop.dto'

export interface UseDetailSopPenyusunActionsParams {
  setSopStatusOverrideAsync: (payload: {
    sopId: string
    status: UpdateStatusDto['status']
  }) => Promise<unknown>
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  isRevisionFlow: boolean
  canKirimUlangKeEvaluator: boolean
  /** Flush autosave header SOP sebelum aksi besar agar tidak ada perubahan tertinggal. */
  flushHeaderAutosave: () => Promise<void>
  /** Flush autosave prosedur sebelum aksi besar. */
  flushProsedurAutosave: () => Promise<void>
}

/**
 * Orkestrasi aksi halaman editor. Persistensi field tetap dimiliki autosave;
 * hook ini hanya mengurutkan flush -> workflow action -> navigation.
 */
export function useDetailSopPenyusunActions({
  setSopStatusOverrideAsync,
  showToast,
  isRevisionFlow,
  canKirimUlangKeEvaluator,
  flushHeaderAutosave,
  flushProsedurAutosave,
}: UseDetailSopPenyusunActionsParams) {
  const queryClient = useQueryClient()
  const flushAll = useCallback(async () => {
    await Promise.all([flushHeaderAutosave(), flushProsedurAutosave()])
  }, [flushHeaderAutosave, flushProsedurAutosave])

  const kirimUlangKeEvaluatorMutation = useMutationWithToast({
    mutationFn: (sopOrDetailId: string) => sopApi.kirimUlangEvaluasiSetelahRevisi(sopOrDetailId),
    invalidateKeys: [...SOP_EVALUASI_WORKFLOW_QUERY_KEYS],
    successMessage: 'SOP berhasil dikirim ulang evaluasi',
    errorMessagePrefix: 'Gagal mengirim ulang evaluasi',
    onSuccess: async (data, sopOrDetailId) => {
      queryClient.setQueryData(queryKeys.penyusunWorkbench(sopOrDetailId), data)
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: queryKeys.evaluasiUmpanBalik(sopOrDetailId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sopRiwayatVersi(data.detail.sopId) }),
      ]
      if (data.detail.id !== sopOrDetailId) {
        queryClient.setQueryData(queryKeys.penyusunWorkbench(data.detail.id), data)
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: queryKeys.evaluasiUmpanBalik(data.detail.id) }),
        )
      }
      await Promise.all(invalidations)
    },
  })

  const handleComplete = useCallback(
    async (
      id: string | undefined,
      role: string | null,
      navigateFn?: (opts: NavigateOptions) => void,
    ) => {
      if (!id || !role) {
        showToast('ID SOP tidak tersedia', 'error')
        return
      }

      try {
        await flushAll()
      } catch {
        showToast(
          'Gagal menyimpan perubahan terlebih dahulu. Periksa data lalu coba lagi.',
          'error',
        )
        return
      }

      try {
        if (isRevisionFlow) {
          if (!canKirimUlangKeEvaluator) {
            const roleBlock = getKirimUlangRoleBlockingReason(role)
            showToast(roleBlock ?? 'Anda tidak berhak mengirim ulang ke evaluator', 'error')
            return
          }
          await kirimUlangKeEvaluatorMutation.mutateAsync(id)
        } else {
          await setSopStatusOverrideAsync({
            sopId: id,
            status: 'MENUNGGU_PENGAJUAN_EVALUASI',
          })
          showToast('SOP berhasil disimpan dan menunggu pengajuan evaluasi.')
        }
        navigateFn?.({ to: ROUTES.PENYUSUN.SOP })
      } catch {
        if (!isRevisionFlow) {
          showToast('Gagal menyelesaikan SOP. Periksa data yang diisi.', 'error')
        }
      }
    },
    [
      flushAll,
      isRevisionFlow,
      canKirimUlangKeEvaluator,
      kirimUlangKeEvaluatorMutation,
      setSopStatusOverrideAsync,
      showToast,
    ],
  )

  return {
    handleComplete,
    isKirimUlangPending: kirimUlangKeEvaluatorMutation.isPending,
  }
}

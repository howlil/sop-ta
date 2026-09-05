import type { InAppNotificationDto } from '@/types/dto/notifications.dto'
import { ROUTES } from '@/utils/constants'

function withRouteId(route: string, id: string): string {
  return route.replace('$id', encodeURIComponent(id))
}

export function resolveNotificationTarget(
  notification: Pick<InAppNotificationDto, 'jenis' | 'pengajuanEvaluasiId'>,
): string {
  const id = notification.pengajuanEvaluasiId

  switch (notification.jenis) {
    case 'EVALUASI_SOP':
      return withRouteId(ROUTES.EVALUATOR.DETAIL_EVALUASI_PENGAJUAN, id)
    case 'TTD_BA_PJ_EVALUATOR':
      return withRouteId(ROUTES.PJ_EVALUATOR.DETAIL_EVALUASI, id)
    case 'TTD_BA_PJ_PENYUSUN':
      return withRouteId(ROUTES.PENYUSUN.DETAIL_BERITA_ACARA, id)
    case 'TTD_SOP_KEPALA_OPD':
      return withRouteId(ROUTES.KEPALA_OPD.DETAIL_PENGAJUAN, id)
  }
}

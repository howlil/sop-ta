import { getActiveEvaluationStatuses } from '../../../common/workflow/evaluation-workflow.graph';
import type { StatusPengajuanEvaluasi } from '../../../generated/prisma';

/** Status pengajuan yang memiliki actor/task aktif pada canonical workflow graph. */
export const STATUS_PENGAJUAN_AKTIF_LINTAS_JOBDESK: readonly StatusPengajuanEvaluasi[] =
  getActiveEvaluationStatuses();

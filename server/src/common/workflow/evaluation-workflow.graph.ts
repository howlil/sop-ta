import { PeranPengguna, StatusPengajuanEvaluasi } from '../../generated/prisma';
import {
  defineWorkflowGraph,
  getAllowedWorkflowActions,
  getWorkflowNode,
  getWorkflowStatesForActions,
  type WorkflowStage,
} from './workflow-graph.protocol';

export type EvaluationWorkflowAction =
  | 'EVALUATE_SUBMISSION'
  | 'COMPLETE_EVALUATION'
  | 'REJECT_EVALUATION'
  | 'SIGN_BA_PJ_EVALUATOR'
  | 'SIGN_BA_PJ_PENYUSUN'
  | 'APPROVE_SOP';

const ALL_ROLES: readonly PeranPengguna[] = [
  PeranPengguna.PJ_EVALUATOR,
  PeranPengguna.EVALUATOR,
  PeranPengguna.KEPALA_OPD,
  PeranPengguna.PJ_PENYUSUN,
  PeranPengguna.PENYUSUN,
];

const TASK_ACTIONS: readonly EvaluationWorkflowAction[] = [
  'EVALUATE_SUBMISSION',
  'SIGN_BA_PJ_EVALUATOR',
  'SIGN_BA_PJ_PENYUSUN',
  'APPROVE_SOP',
];

export const EVALUATION_WORKFLOW_GRAPH = defineWorkflowGraph<
  StatusPengajuanEvaluasi,
  EvaluationWorkflowAction,
  PeranPengguna
>({
  nodes: {
    [StatusPengajuanEvaluasi.SEDANG_DIEVALUASI]: {
      stage: 'PROCESS_REVIEW',
      actions: [{ action: 'EVALUATE_SUBMISSION', roles: [PeranPengguna.EVALUATOR] }],
    },
    [StatusPengajuanEvaluasi.DITOLAK]: {
      stage: 'PROCESS_REVIEW',
      terminal: true,
    },
    [StatusPengajuanEvaluasi.SELESAI_DIEVALUASI]: { stage: 'FINAL_APPROVAL' },
    [StatusPengajuanEvaluasi.DITANDATANGANI_PJ_EVALUATOR]: { stage: 'TTE' },
    [StatusPengajuanEvaluasi.DITANDATANGANI_PJ_PENYUSUN]: {
      stage: 'TTE',
      actions: [{ action: 'APPROVE_SOP', roles: [PeranPengguna.KEPALA_OPD] }],
    },
    [StatusPengajuanEvaluasi.SELESAI]: { stage: 'EFFECTIVE', terminal: true },
  },
  transitions: [
    {
      from: StatusPengajuanEvaluasi.SEDANG_DIEVALUASI,
      to: StatusPengajuanEvaluasi.SELESAI_DIEVALUASI,
      action: 'COMPLETE_EVALUATION',
      roles: [PeranPengguna.EVALUATOR],
    },
    {
      from: StatusPengajuanEvaluasi.SEDANG_DIEVALUASI,
      to: StatusPengajuanEvaluasi.DITOLAK,
      action: 'REJECT_EVALUATION',
      roles: [PeranPengguna.EVALUATOR],
    },
    {
      from: StatusPengajuanEvaluasi.SELESAI_DIEVALUASI,
      to: StatusPengajuanEvaluasi.DITANDATANGANI_PJ_EVALUATOR,
      action: 'SIGN_BA_PJ_EVALUATOR',
      roles: [PeranPengguna.PJ_EVALUATOR],
    },
    {
      from: StatusPengajuanEvaluasi.DITANDATANGANI_PJ_EVALUATOR,
      to: StatusPengajuanEvaluasi.DITANDATANGANI_PJ_PENYUSUN,
      action: 'SIGN_BA_PJ_PENYUSUN',
      roles: [PeranPengguna.PJ_PENYUSUN],
    },
  ],
  actionOrder: [
    'EVALUATE_SUBMISSION',
    'COMPLETE_EVALUATION',
    'REJECT_EVALUATION',
    'SIGN_BA_PJ_EVALUATOR',
    'SIGN_BA_PJ_PENYUSUN',
    'APPROVE_SOP',
  ],
});

export function getEvaluationWorkflowStage(status: StatusPengajuanEvaluasi): WorkflowStage {
  return getWorkflowNode(EVALUATION_WORKFLOW_GRAPH, status).stage;
}

export function getEvaluationWorkflowActions(
  role: PeranPengguna,
  status: StatusPengajuanEvaluasi,
): readonly EvaluationWorkflowAction[] {
  return getAllowedWorkflowActions(EVALUATION_WORKFLOW_GRAPH, role, status);
}

export function getEvaluationStatusesForActions(
  role: PeranPengguna,
  actions: readonly EvaluationWorkflowAction[],
): readonly StatusPengajuanEvaluasi[] {
  return getWorkflowStatesForActions(EVALUATION_WORKFLOW_GRAPH, role, actions);
}

export function getEvaluationTaskOwner(
  status: StatusPengajuanEvaluasi,
): Readonly<{ action: EvaluationWorkflowAction; roles: readonly PeranPengguna[] }> | null {
  for (const action of TASK_ACTIONS) {
    const roles = ALL_ROLES.filter((role) =>
      getEvaluationWorkflowActions(role, status).includes(action),
    );
    if (roles.length > 0) return { action, roles };
  }
  return null;
}

export function getActiveEvaluationStatuses(): readonly StatusPengajuanEvaluasi[] {
  return (Object.values(StatusPengajuanEvaluasi) as StatusPengajuanEvaluasi[]).filter(
    (status) => getEvaluationTaskOwner(status) !== null,
  );
}

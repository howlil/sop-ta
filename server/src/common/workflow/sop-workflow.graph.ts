import { PeranPengguna, StatusSOP } from '../../generated/prisma';
import {
  defineWorkflowGraph,
  findWorkflowTransition,
  getAllowedWorkflowActions,
  getWorkflowNode,
  getWorkflowStatesForActions,
  type WorkflowStage,
} from './workflow-graph.protocol';

export type SopWorkflowAction =
  | 'EDIT'
  | 'SUBMIT_FOR_REVIEW'
  | 'SUBMIT_EVALUATION'
  | 'RESUBMIT_EVALUATION'
  | 'SIGN'
  | 'REVOKE'
  | 'VIEW_HISTORY';

const ALL_ROLES: readonly PeranPengguna[] = [
  PeranPengguna.PJ_EVALUATOR,
  PeranPengguna.EVALUATOR,
  PeranPengguna.KEPALA_OPD,
  PeranPengguna.PJ_PENYUSUN,
  PeranPengguna.PENYUSUN,
];

const AUTHORING_ROLES: readonly PeranPengguna[] = [
  PeranPengguna.PENYUSUN,
  PeranPengguna.PJ_PENYUSUN,
];

export const SOP_WORKFLOW_GRAPH = defineWorkflowGraph<
  StatusSOP,
  SopWorkflowAction,
  PeranPengguna
>({
  nodes: {
    [StatusSOP.DRAFT]: {
      stage: 'AUTHORING',
      actions: [{ action: 'EDIT', roles: AUTHORING_ROLES }],
    },
    [StatusSOP.SEDANG_DISUSUN]: {
      stage: 'AUTHORING',
      actions: [{ action: 'EDIT', roles: AUTHORING_ROLES }],
    },
    [StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI]: { stage: 'AUTHORING' },
    [StatusSOP.DIAJUKAN_EVALUASI]: { stage: 'PROCESS_REVIEW' },
    [StatusSOP.SEDANG_DIEVALUASI]: { stage: 'PROCESS_REVIEW' },
    [StatusSOP.REVISI_DARI_EVALUATOR]: {
      stage: 'AUTHORING',
      actions: [
        { action: 'EDIT', roles: AUTHORING_ROLES },
        { action: 'RESUBMIT_EVALUATION', roles: [PeranPengguna.PJ_PENYUSUN] },
      ],
    },
    [StatusSOP.DITOLAK_EVALUATOR]: { stage: 'AUTHORING', terminal: true },
    [StatusSOP.MENUNGGU_TTD_PJ_EVALUATOR]: { stage: 'FINAL_APPROVAL' },
    [StatusSOP.DIVERIFIKASI_PJ_EVALUATOR_ORGANISASI]: {
      stage: 'FINAL_APPROVAL',
      actions: [{ action: 'SIGN', roles: [PeranPengguna.KEPALA_OPD] }],
    },
    [StatusSOP.BERLAKU]: { stage: 'EFFECTIVE' },
    [StatusSOP.DIGANTIKAN]: { stage: 'SUPERSEDED', terminal: true },
    [StatusSOP.DICABUT]: { stage: 'REVOKED', terminal: true },
  },
  transitions: [
    {
      from: StatusSOP.DRAFT,
      to: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      action: 'SUBMIT_FOR_REVIEW',
      roles: AUTHORING_ROLES,
    },
    {
      from: StatusSOP.SEDANG_DISUSUN,
      to: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      action: 'SUBMIT_FOR_REVIEW',
      roles: AUTHORING_ROLES,
    },
    {
      from: StatusSOP.REVISI_DARI_EVALUATOR,
      to: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      action: 'SUBMIT_FOR_REVIEW',
      roles: AUTHORING_ROLES,
    },
    {
      from: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      to: StatusSOP.DIAJUKAN_EVALUASI,
      action: 'SUBMIT_EVALUATION',
      roles: [PeranPengguna.PJ_PENYUSUN],
    },
    {
      from: StatusSOP.BERLAKU,
      to: StatusSOP.DICABUT,
      action: 'REVOKE',
      roles: [PeranPengguna.KEPALA_OPD],
    },
  ],
  globalActions: [{ action: 'VIEW_HISTORY', roles: ALL_ROLES }],
  actionOrder: [
    'VIEW_HISTORY',
    'EDIT',
    'SUBMIT_FOR_REVIEW',
    'SUBMIT_EVALUATION',
    'RESUBMIT_EVALUATION',
    'SIGN',
    'REVOKE',
  ],
});

export function getSopWorkflowStage(status: StatusSOP): WorkflowStage {
  return getWorkflowNode(SOP_WORKFLOW_GRAPH, status).stage;
}

export function getSopWorkflowActions(
  role: PeranPengguna,
  status: StatusSOP,
): readonly SopWorkflowAction[] {
  return getAllowedWorkflowActions(SOP_WORKFLOW_GRAPH, role, status);
}

export function getSopTransition(current: StatusSOP, target: StatusSOP) {
  return findWorkflowTransition(SOP_WORKFLOW_GRAPH, current, target);
}

export function getSopStatusesForActions(
  role: PeranPengguna,
  actions: readonly SopWorkflowAction[],
): readonly StatusSOP[] {
  return getWorkflowStatesForActions(SOP_WORKFLOW_GRAPH, role, actions);
}

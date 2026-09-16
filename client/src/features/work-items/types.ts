export type WorkItemKind =
  | 'SOP_DRAFT'
  | 'SOP_REVISION'
  | 'SUBMIT_EVALUATION'
  | 'EVALUATE_SUBMISSION'
  | 'SIGN_EVALUATION_BA_PJ_EVALUATOR'
  | 'SIGN_EVALUATION_BA_PJ_PENYUSUN'
  | 'APPROVE_SOP'

export interface WorkItem {
  id: string
  kind: WorkItemKind
  targetId: string
  title: string
  context: string
  stage: string
  actionLabel: string
  actionHref: string
  updatedAt: string
}

export interface WorkItemsResponse {
  items: WorkItem[]
  count: number
}

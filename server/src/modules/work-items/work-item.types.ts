export type WorkItemKind =
  | 'SOP_DRAFT'
  | 'SOP_REVISION'
  | 'SUBMIT_EVALUATION'
  | 'EVALUATE_SUBMISSION'
  | 'SIGN_EVALUATION_BA_PJ_EVALUATOR'
  | 'SIGN_EVALUATION_BA_PJ_PENYUSUN'
  | 'APPROVE_SOP';

export type WorkItem = Readonly<{
  id: string;
  kind: WorkItemKind;
  targetId: string;
  title: string;
  context: string;
  stage: string;
  actionLabel: string;
  actionHref: string;
  updatedAt: string;
}>;

export type WorkItemsResponse = Readonly<{
  items: WorkItem[];
  count: number;
}>;

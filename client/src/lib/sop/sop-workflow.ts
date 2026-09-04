export type SopWorkflowAction =
  | 'EDIT'
  | 'SUBMIT_FOR_REVIEW'
  | 'SUBMIT_EVALUATION'
  | 'RESUBMIT_EVALUATION'
  | 'SIGN'
  | 'REVOKE'
  | 'VIEW_HISTORY'

export type SopWorkflowStage =
  | 'AUTHORING'
  | 'PROCESS_REVIEW'
  | 'FINAL_APPROVAL'
  | 'EFFECTIVE'
  | 'SUPERSEDED'
  | 'REVOKED'

export type SopWorkflowProjection = Readonly<{
  stage: SopWorkflowStage
  stateLabel: string
  allowedActions: readonly SopWorkflowAction[]
}>

type WorkflowCarrier = Readonly<{
  workflow?: SopWorkflowProjection
}>

export function hasSopWorkflowAction(
  value: WorkflowCarrier | null | undefined,
  action: SopWorkflowAction,
): boolean {
  return value?.workflow?.allowedActions.includes(action) === true
}

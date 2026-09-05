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

function readWorkflow(value: unknown): SopWorkflowProjection | undefined {
  if (typeof value !== 'object' || value === null || !('workflow' in value)) return undefined
  const workflow = (value as { workflow?: unknown }).workflow
  if (typeof workflow !== 'object' || workflow === null || !('allowedActions' in workflow)) {
    return undefined
  }
  const allowedActions = (workflow as { allowedActions?: unknown }).allowedActions
  if (!Array.isArray(allowedActions)) return undefined
  return workflow as SopWorkflowProjection
}

export function hasSopWorkflowAction(
  value: unknown,
  action: SopWorkflowAction,
): boolean {
  return readWorkflow(value)?.allowedActions.includes(action) === true
}

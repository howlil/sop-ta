import { ApiProperty } from '@nestjs/swagger';
import type {
  SopWorkflowAction,
  SopWorkflowStage,
} from '../sop-status-policy';

export class SopWorkflowProjectionDto {
  @ApiProperty({
    enum: ['AUTHORING', 'PROCESS_REVIEW', 'FINAL_APPROVAL', 'EFFECTIVE', 'SUPERSEDED', 'REVOKED'],
  })
  readonly stage!: SopWorkflowStage;

  @ApiProperty({ description: 'Label state workflow untuk UI.' })
  readonly stateLabel!: string;

  @ApiProperty({
    isArray: true,
    enum: [
      'EDIT',
      'SUBMIT_FOR_REVIEW',
      'SUBMIT_EVALUATION',
      'RESUBMIT_EVALUATION',
      'SIGN',
      'REVOKE',
      'VIEW_HISTORY',
    ],
  })
  readonly allowedActions!: readonly SopWorkflowAction[];
}

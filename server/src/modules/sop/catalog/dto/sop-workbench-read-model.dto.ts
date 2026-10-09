import { ApiProperty } from '@nestjs/swagger';
import { PenyusunWorkbenchDiagramKonfigurasiDto } from '../../diagram/dto/penyusun-workbench-diagram.dto';
import { PenyusunWorkbenchDetailDto } from './penyusun-workbench-detail.dto';
import { PenyusunWorkbenchLangkahDto } from './penyusun-workbench-langkah.dto';
import { PenyusunWorkbenchLogEditDto } from './penyusun-workbench-log-edit.dto';
import { SopWorkflowProjectionDto } from './sop-workflow.dto';
import { BeritaAcaraTteSignaturePayloadDto } from '../../../../common/contracts/tte-signature-payload.dto';

/**
 * Read-model lintas SOP/Evaluation untuk dokumen SOP lengkap.
 * Class name dipertahankan agar consumer dan schema Swagger existing tetap identik.
 */
export class PenyusunWorkbenchDataDto {
  @ApiProperty({ type: () => PenyusunWorkbenchDetailDto })
  readonly detail!: PenyusunWorkbenchDetailDto;

  @ApiProperty({
    type: () => [PenyusunWorkbenchLangkahDto],
    description: 'Semua langkah prosedur berurutan; tidak dipaginasi.',
  })
  readonly langkah!: PenyusunWorkbenchLangkahDto[];

  @ApiProperty({ type: () => [PenyusunWorkbenchLogEditDto] })
  readonly logEdit!: PenyusunWorkbenchLogEditDto[];

  @ApiProperty({ type: () => PenyusunWorkbenchDiagramKonfigurasiDto, required: false })
  readonly diagramKonfigurasi?: PenyusunWorkbenchDiagramKonfigurasiDto;

  @ApiProperty({ type: () => BeritaAcaraTteSignaturePayloadDto, required: false })
  readonly tteSignaturePayloadKepalaOpd?: BeritaAcaraTteSignaturePayloadDto;

  @ApiProperty({ type: () => SopWorkflowProjectionDto, required: false })
  readonly workflow?: SopWorkflowProjectionDto;
}

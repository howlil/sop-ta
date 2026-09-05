import { ApiProperty } from '@nestjs/swagger';
import { PenyusunWorkbenchDiagramKonfigurasiDto } from '../../modules/sop/diagram/dto/penyusun-workbench-diagram.dto';
import { PenyusunWorkbenchDetailDto } from '../../modules/sop/catalog/dto/penyusun-workbench-detail.dto';
import { PenyusunWorkbenchLangkahDto } from '../../modules/sop/catalog/dto/penyusun-workbench-langkah.dto';
import { PenyusunWorkbenchLogEditDto } from '../../modules/sop/catalog/dto/penyusun-workbench-log-edit.dto';
import { SopWorkflowProjectionDto } from '../../modules/sop/catalog/dto/sop-workflow.dto';
import { BeritaAcaraTteSignaturePayloadDto } from './tte-signature-payload.dto';

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

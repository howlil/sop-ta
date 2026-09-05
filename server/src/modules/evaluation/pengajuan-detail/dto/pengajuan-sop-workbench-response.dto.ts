import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PenyusunWorkbenchDataDto } from '../../../../common/contracts/sop-workbench-read-model.dto';
import { BeritaAcaraTteSignaturePayloadDto } from '../../../../common/contracts/tte-signature-payload.dto';

/** Respons GET `/evaluasi/pengajuan/:pengajuanId/sop-dokumen/:detailSopId`. */
export class PengajuanSopWorkbenchResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly detailSopId!: string;

  @ApiProperty({ type: () => PenyusunWorkbenchDataDto })
  readonly workbench!: PenyusunWorkbenchDataDto;

  @ApiPropertyOptional({
    type: () => BeritaAcaraTteSignaturePayloadDto,
    description: 'Muatan data QR TTE Kepala OPD bila SOP sudah ditandatangani',
  })
  readonly tteSignaturePayloadKepalaOpd?: BeritaAcaraTteSignaturePayloadDto;
}

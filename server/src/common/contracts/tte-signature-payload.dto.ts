import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payload tanda tangan yang dipakai lintas SOP/Evaluation.
 * Nama class dipertahankan untuk menjaga schema/contract Swagger existing.
 */
export class BeritaAcaraTteSignaturePayloadDto {
  @ApiProperty({ description: 'ID stabil turunan `dokumenTteId:userId` (kompatibilitas klien)' })
  readonly id!: string;

  @ApiProperty({ format: 'uuid' })
  readonly dokumenTteId!: string;

  @ApiProperty({ format: 'uuid' })
  readonly userId!: string;

  @ApiProperty()
  readonly nip!: string;

  @ApiProperty()
  readonly namaLengkap!: string;

  @ApiPropertyOptional()
  readonly jabatan?: string;

  @ApiPropertyOptional()
  readonly signedAt?: string;
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import type { JwtAccessPayload } from '../../../common';
import {
  PDF_BASE64_MAX_LENGTH,
  PDF_BINARY_MAX_BYTES,
} from '../../../common/http/request-body-limits';
import { JenisDokumenTte } from '../../../generated/prisma';

import { SignPdfDto } from '../shared/dto/sign-pdf.dto';
import { VerifyPdfDto } from '../shared/dto/verify-pdf.dto';
import type { PdfCertificateResponse } from '../shared/utils/pdf-signing-certificate.util';

export type { PdfCertificateResponse } from '../shared/utils/pdf-signing-certificate.util';
import {
  assertValidPdfBuffer,
  type PdfSignatureVerificationEntry,
  type VerifyPdfSignaturesResult,
} from '../shared/utils/pdf-signature-verification.util';
import { TteRepository, type PdfSignatureMetadataInput } from '../shared/repository/tte.repository';
import {
  DOCUMENT_SIGNING_PROVIDER,
  type DocumentSigningProvider,
} from './signing/document-signing.provider';

export type SignPdfResponse = {
  readonly signed: boolean;
  readonly signedPdfBase64: string;
  readonly sha256SignedPdf: string;
  readonly signatureFormat: 'PKCS7_DETACHED' | 'UNSIGNED_DISABLED' | 'UNSIGNED_NOT_REQUIRED';
  readonly certificate: PdfCertificateResponse | null;
};

export type OfficialPdfSigningResult = {
  readonly signedPdf: Buffer;
  readonly sha256SignedPdf: string;
  readonly signatureFormat: 'PKCS7_DETACHED';
  readonly certificate: PdfCertificateResponse;
  readonly riwayatMetadata: PdfSignatureMetadataInput;
};

export type PdfSigningStatusResponse = {
  readonly enabled: boolean;
  readonly trustedCaSubject: string | null;
  readonly trustedSignerSubject: string | null;
  readonly verificationPath: string;
  readonly configError?: string;
};

export type VerifyPdfResponse = {
  readonly pdfSigningEnabled: boolean;
  readonly trustedCaSubject: string | null;
  readonly hasSignatures: boolean;
  readonly allValid: boolean;
  readonly signatures: readonly PdfSignatureVerificationEntryWithTteMatch[];
  readonly disclaimer: string;
};

export type PdfSignatureTteMatch = {
  readonly matched: boolean;
  readonly reason: string;
  readonly dokumenTteId?: string;
  readonly userId?: string;
  readonly peran?: string;
  readonly jenisDokumen?: string;
  readonly nomorDokumen?: string;
  readonly judulDokumen?: string;
  readonly ditandatanganiPada?: string;
};

export type PdfSignatureVerificationEntryWithTteMatch = PdfSignatureVerificationEntry & {
  readonly tteMatch: PdfSignatureTteMatch;
};

const PDF_VERIFICATION_DISCLAIMER =
  'Verifikasi ini memakai CA internal SOPFlow. Untuk TTE tersertifikasi nasional, gunakan portal resmi Komdigi atau BSrE.';

@Injectable()
export class TtePdfSigningService {
  constructor(
    private readonly configService: ConfigService,
    private readonly repository: TteRepository,
    @Inject(DOCUMENT_SIGNING_PROVIDER)
    private readonly signingProvider: DocumentSigningProvider,
  ) {}

  getPdfSigningStatus(): PdfSigningStatusResponse {
    return {
      enabled: this.isPdfSigningEnabled(),
      trustedCaSubject: null,
      trustedSignerSubject: null,
      verificationPath: '/validasi/pdf',
    };
  }

  async verifyPdf(dto: VerifyPdfDto): Promise<VerifyPdfResponse> {
    const pdfBuffer = this.decodePdf(dto.pdfBase64);
    let verification: VerifyPdfSignaturesResult;
    try {
      verification = this.signingProvider.verify(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memverifikasi PDF.';
      throw new BadRequestException(message);
    }
    const signatures = await Promise.all(
      verification.signatures.map((entry) => this.attachTteMatch(entry)),
    );
    return {
      // Verifikasi tetap tersedia walaupun pembuatan signature baru dimatikan.
      pdfSigningEnabled: this.isPdfSigningEnabled(),
      trustedCaSubject: null,
      hasSignatures: verification.hasSignatures,
      allValid: verification.allValid && signatures.every((entry) => entry.tteMatch.matched),
      signatures,
      disclaimer: PDF_VERIFICATION_DISCLAIMER,
    };
  }

  async signPdf(user: JwtAccessPayload, dto: SignPdfDto): Promise<SignPdfResponse> {
    if (dto.userId !== user.sub) {
      throw new ForbiddenException('PDF hanya bisa ditandatangani oleh pemilik riwayat TTE.');
    }
    const pdfBuffer = this.decodePdf(dto.pdfBase64);
    const riwayat = await this.repository.findRiwayatForPdfSigning(dto.userId, dto.dokumenTteId);
    if (riwayat === null) {
      throw new NotFoundException('Riwayat tanda tangan dokumen tidak ditemukan.');
    }
    if (riwayat.dokumenTte.jenisDokumen !== dto.jenisDokumen) {
      throw new BadRequestException('Jenis dokumen tidak sesuai dengan riwayat TTE.');
    }
    if (dto.jenisDokumen !== JenisDokumenTte.SOP_BERLAKU) {
      return this.buildSkippedCaResponse(pdfBuffer);
    }
    if (!this.isPdfSigningEnabled()) {
      return this.buildDisabledResponse(pdfBuffer);
    }

    const signed = await this.signingProvider.sign({
      document: pdfBuffer,
      signer: {
        userId: dto.userId,
        name: riwayat.user.nama,
      },
      authorization: { pin: dto.pin },
      context: {
        dokumenTteId: dto.dokumenTteId,
        jenisDokumen: dto.jenisDokumen,
      },
    });
    await this.repository.updateRiwayatPdfSignatureMetadata({
      userId: dto.userId,
      dokumenTteId: dto.dokumenTteId,
      metadata: signed.riwayatMetadata,
    });
    return {
      signed: true,
      signedPdfBase64: signed.signedDocument.toString('base64'),
      sha256SignedPdf: signed.sha256SignedDocument,
      signatureFormat: signed.signatureFormat,
      certificate: signed.certificate,
    };
  }

  async signOfficialSopPdfWithUserCertificate(params: {
    userId: string;
    pin: string;
    dokumenTteId: string;
    pdfBuffer: Buffer;
    signerName: string;
  }): Promise<OfficialPdfSigningResult> {
    if (!this.isPdfSigningEnabled()) {
      throw new ConflictException('Penandatanganan PDF kriptografis sedang dinonaktifkan.');
    }

    const signed = await this.signingProvider.sign({
      document: params.pdfBuffer,
      signer: {
        userId: params.userId,
        name: params.signerName,
      },
      authorization: { pin: params.pin },
      context: {
        dokumenTteId: params.dokumenTteId,
        jenisDokumen: JenisDokumenTte.SOP_BERLAKU,
      },
    });
    return {
      signedPdf: signed.signedDocument,
      sha256SignedPdf: signed.sha256SignedDocument,
      signatureFormat: signed.signatureFormat,
      certificate: signed.certificate,
      riwayatMetadata: signed.riwayatMetadata,
    };
  }

  private isPdfSigningEnabled(): boolean {
    return this.configService.get<boolean>('PDF_SIGNING_ENABLED', true);
  }

  private decodePdf(pdfBase64: string): Buffer {
    if (pdfBase64.length > PDF_BASE64_MAX_LENGTH) {
      throw new BadRequestException('Ukuran PDF melebihi batas unggah.');
    }
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (pdfBuffer.byteLength > PDF_BINARY_MAX_BYTES) {
      throw new BadRequestException('Ukuran PDF melebihi batas unggah.');
    }
    try {
      assertValidPdfBuffer(pdfBuffer);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Ukuran PDF tidak valid.',
      );
    }
    return pdfBuffer;
  }

  private buildSkippedCaResponse(pdfBuffer: Buffer): SignPdfResponse {
    return {
      signed: false,
      signedPdfBase64: pdfBuffer.toString('base64'),
      sha256SignedPdf: this.sha256Hex(pdfBuffer),
      signatureFormat: 'UNSIGNED_NOT_REQUIRED',
      certificate: null,
    };
  }

  private buildDisabledResponse(pdfBuffer: Buffer): SignPdfResponse {
    return {
      signed: false,
      signedPdfBase64: pdfBuffer.toString('base64'),
      sha256SignedPdf: this.sha256Hex(pdfBuffer),
      signatureFormat: 'UNSIGNED_DISABLED',
      certificate: null,
    };
  }

  private sha256Hex(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async attachTteMatch(
    entry: PdfSignatureVerificationEntry,
  ): Promise<PdfSignatureVerificationEntryWithTteMatch> {
    const binding = entry.binding;
    if (binding === null) {
      return {
        ...entry,
        tteMatch: {
          matched: false,
          reason:
            'Signature PDF valid kriptografis, tetapi tidak memuat binding dokumen TTE aplikasi.',
        },
      };
    }
    const row = await this.repository.findRiwayatByPdfSignatureBinding({
      userId: binding.userId,
      dokumenTteId: binding.dokumenTteId,
    });
    if (row === null) {
      return {
        ...entry,
        tteMatch: {
          matched: false,
          reason: 'Binding signature tidak ditemukan pada riwayat TTE aplikasi.',
          dokumenTteId: binding.dokumenTteId,
          userId: binding.userId,
          jenisDokumen: binding.jenisDokumen,
        },
      };
    }
    if (String(row.dokumenTte.jenisDokumen) !== binding.jenisDokumen) {
      return {
        ...entry,
        tteMatch: {
          matched: false,
          reason: 'Jenis dokumen pada signature PDF tidak cocok dengan riwayat TTE aplikasi.',
          dokumenTteId: row.dokumenTteId,
          userId: row.userId,
          peran: String(row.peran),
          jenisDokumen: String(row.dokumenTte.jenisDokumen),
        },
      };
    }
    if (
      row.signatureValue === null ||
      row.certFingerprint === null ||
      row.certSerialNumber === null
    ) {
      return {
        ...entry,
        tteMatch: {
          matched: false,
          reason: 'Riwayat TTE ditemukan, tetapi metadata signature PDF belum tersimpan.',
          dokumenTteId: row.dokumenTteId,
          userId: row.userId,
          peran: String(row.peran),
          jenisDokumen: String(row.dokumenTte.jenisDokumen),
          nomorDokumen: row.dokumenTte.nomorDokumen,
          judulDokumen: row.dokumenTte.judulDokumen,
          ditandatanganiPada: row.ditandatanganiPada.toISOString(),
        },
      };
    }
    const certMatches =
      row.certFingerprint === entry.certificate.fingerprint &&
      row.certSerialNumber === entry.certificate.serialNumber;
    const signatureValueMatches = row.signatureValue === entry.signatureValue;
    return {
      ...entry,
      tteMatch: {
        matched: entry.valid && certMatches && signatureValueMatches,
        reason:
          entry.valid && certMatches && signatureValueMatches
            ? 'Signature PDF cocok dengan riwayat TTE aplikasi, signature value, dan sertifikat yang tersimpan.'
            : 'Signature PDF tidak cocok dengan signature value/fingerprint/serial sertifikat pada riwayat TTE aplikasi.',
        dokumenTteId: row.dokumenTteId,
        userId: row.userId,
        peran: String(row.peran),
        jenisDokumen: String(row.dokumenTte.jenisDokumen),
        nomorDokumen: row.dokumenTte.nomorDokumen,
        judulDokumen: row.dokumenTte.judulDokumen,
        ditandatanganiPada: row.ditandatanganiPada.toISOString(),
      },
    };
  }
}

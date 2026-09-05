import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import { P12Signer } from '@signpdf/signer-p12';
import { SignPdf } from '@signpdf/signpdf';
import { PDFDocument } from 'pdf-lib';
import { TteRepository } from '../../shared/repository/tte.repository';
import {
  loadTrustedCertificatesFromP12,
  mapCertificateToResponse,
} from '../../shared/utils/pdf-signing-certificate.util';
import {
  buildPdfTteSigningReason,
  extractPdfSignatureFields,
  verifyPdfSignaturesGeneric,
  type VerifyPdfSignaturesResult,
} from '../../shared/utils/pdf-signature-verification.util';
import { decryptP12Passphrase } from '../../shared/utils/tte-crypto.util';
import type {
  DocumentSigningProvider,
  DocumentSigningRequest,
  DocumentSigningResult,
} from './document-signing.provider';

const DEFAULT_SIGNATURE_LENGTH = 32_000;

type InternalP12SigningConfig = Readonly<{
  reason: string;
  location: string;
  contactInfo: string;
}>;

@Injectable()
export class InternalP12SigningProvider implements DocumentSigningProvider {
  private readonly logger = new Logger(InternalP12SigningProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly repository: TteRepository,
  ) {}

  async sign(input: DocumentSigningRequest): Promise<DocumentSigningResult> {
    const kredensial = await this.repository.findKredensial(input.signer.userId);
    if (!kredensial || !kredensial.p12Base64 || !kredensial.p12PassphraseEncrypted) {
      throw new BadRequestException(
        'Sertifikat TTE personal belum diatur. Silakan buat di halaman Profil.',
      );
    }

    const passphrase = this.decryptPassphrase({
      pin: input.authorization.pin,
      encryptedPassphrase: kredensial.p12PassphraseEncrypted,
    });
    const config = this.getConfig();
    const reason = buildPdfTteSigningReason(config.reason, {
      dokumenTteId: input.context.dokumenTteId,
      userId: input.signer.userId,
      jenisDokumen: String(input.context.jenisDokumen),
    });

    return this.applyPkcs7Signature({
      pdfBuffer: input.document,
      p12Base64: kredensial.p12Base64,
      passphrase,
      config,
      signerName: input.signer.name,
      reason,
    });
  }

  verify(document: Buffer): VerifyPdfSignaturesResult {
    return verifyPdfSignaturesGeneric(document);
  }

  private async applyPkcs7Signature(params: {
    pdfBuffer: Buffer;
    p12Base64: string;
    passphrase: string;
    config: InternalP12SigningConfig;
    signerName: string;
    reason: string;
  }): Promise<DocumentSigningResult> {
    const p12Buffer = Buffer.from(params.p12Base64, 'base64');
    const signingTime = new Date();
    try {
      const trusted = loadTrustedCertificatesFromP12(p12Buffer, params.passphrase);
      const certificate = mapCertificateToResponse(trusted.signingCertificate);
      const placeholderPdf = await this.buildPlaceholderPdf({
        pdfBuffer: params.pdfBuffer,
        config: params.config,
        signerName: params.signerName,
        reason: params.reason,
        signingTime,
      });
      const signer = new P12Signer(p12Buffer, {
        passphrase: params.passphrase,
        asn1StrictParsing: false,
      });
      const signedPdf = await new SignPdf().sign(placeholderPdf, signer, signingTime);
      const signatureFields = extractPdfSignatureFields(signedPdf);
      const pkcs7Signature = signatureFields[signatureFields.length - 1]?.pkcs7Buffer;
      const signatureValue =
        pkcs7Signature === undefined ? this.sha256Hex(signedPdf) : this.sha256Hex(pkcs7Signature);

      return {
        signedDocument: signedPdf,
        sha256SignedDocument: this.sha256Hex(signedPdf),
        signatureFormat: 'PKCS7_DETACHED',
        certificate,
        riwayatMetadata: {
          signatureValue: `sha256:${signatureValue}`,
          signatureAlgorithm: 'SHA256withRSA',
          signatureFormat: 'PKCS7_DETACHED',
          certSerialNumber: certificate.serialNumber,
          certIssuer: certificate.issuer,
          certSubject: certificate.subject,
          certFingerprint: certificate.fingerprint,
          certValidFrom: new Date(certificate.validFrom),
          certValidTo: new Date(certificate.validTo),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error
          ? `Gagal menandatangani PDF: ${error.message}`
          : 'Gagal menandatangani PDF.',
      );
    }
  }

  private async buildPlaceholderPdf(params: {
    pdfBuffer: Buffer;
    config: InternalP12SigningConfig;
    signerName: string;
    reason: string;
    signingTime: Date;
  }): Promise<Buffer> {
    const placeholderInput = {
      reason: params.reason,
      contactInfo: params.config.contactInfo,
      name: params.signerName,
      location: params.config.location,
      signingTime: params.signingTime,
      signatureLength: DEFAULT_SIGNATURE_LENGTH,
    };
    try {
      const pdfDoc = await PDFDocument.load(params.pdfBuffer, { ignoreEncryption: true });
      pdflibAddPlaceholder({ pdfDoc, ...placeholderInput });
      return Buffer.from(
        await pdfDoc.save({
          useObjectStreams: false,
          addDefaultPage: false,
          updateFieldAppearances: false,
        }),
      );
    } catch (pdflibError) {
      const detail =
        pdflibError instanceof Error ? pdflibError.message : 'format PDF tidak dikenali';
      this.logger.warn(`Placeholder pdf-lib gagal (${detail}); mencoba plainAddPlaceholder.`);
      return plainAddPlaceholder({ pdfBuffer: params.pdfBuffer, ...placeholderInput });
    }
  }

  private decryptPassphrase(params: { pin: string; encryptedPassphrase: string }): string {
    try {
      return decryptP12Passphrase(params.encryptedPassphrase, params.pin);
    } catch {
      throw new ForbiddenException(
        'PIN TTE salah atau kredensial sertifikat perlu disiapkan ulang.',
      );
    }
  }

  private getConfig(): InternalP12SigningConfig {
    return {
      reason: this.configService.get<string>('PDF_SIGNING_REASON', 'Pengesahan dokumen SOP'),
      location: this.configService.get<string>('PDF_SIGNING_LOCATION', 'Indonesia'),
      contactInfo: this.configService.get<string>('PDF_SIGNING_CONTACT', ''),
    };
  }

  private sha256Hex(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}

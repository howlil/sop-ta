import type { JenisDokumenTte } from '../../../../generated/prisma';
import type { PdfSignatureMetadataInput } from '../../shared/repository/tte.repository';
import type { PdfCertificateResponse } from '../../shared/utils/pdf-signing-certificate.util';
import type { VerifyPdfSignaturesResult } from '../../shared/utils/pdf-signature-verification.util';

export const DOCUMENT_SIGNING_PROVIDER = Symbol('DOCUMENT_SIGNING_PROVIDER');

export type DocumentSigningRequest = Readonly<{
  document: Buffer;
  signer: Readonly<{
    userId: string;
    name: string;
  }>;
  authorization: Readonly<{
    pin: string;
  }>;
  context: Readonly<{
    dokumenTteId: string;
    jenisDokumen: JenisDokumenTte;
  }>;
}>;

export type DocumentSigningResult = Readonly<{
  signedDocument: Buffer;
  sha256SignedDocument: string;
  signatureFormat: 'PKCS7_DETACHED';
  certificate: PdfCertificateResponse;
  riwayatMetadata: PdfSignatureMetadataInput;
}>;

export interface DocumentSigningProvider {
  sign(input: DocumentSigningRequest): Promise<DocumentSigningResult>;
  verify(document: Buffer): VerifyPdfSignaturesResult;
}

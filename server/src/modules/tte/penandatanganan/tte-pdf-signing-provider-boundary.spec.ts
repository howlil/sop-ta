import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { JenisDokumenTte, PeranPengguna } from '../../../generated/prisma';
import { TteRepository } from '../shared/repository/tte.repository';
import {
  DOCUMENT_SIGNING_PROVIDER,
  type DocumentSigningProvider,
} from './signing/document-signing.provider';
import { TtePdfSigningService } from './tte-pdf-signing.service';

describe('TtePdfSigningService provider boundary', () => {
  it('mendelegasikan signing ke provider tanpa mengetahui implementasi P12', async () => {
    const signedDocument = Buffer.from('%PDF-1.4\nsigned');
    const metadata = {
      signatureValue: 'sha256:signature',
      signatureAlgorithm: 'SHA256withRSA',
      signatureFormat: 'PKCS7_DETACHED',
      certSerialNumber: '01',
      certIssuer: 'CN=Issuer',
      certSubject: 'CN=Signer',
      certFingerprint: 'fingerprint',
      certValidFrom: new Date('2026-01-01T00:00:00.000Z'),
      certValidTo: new Date('2027-01-01T00:00:00.000Z'),
    } as const;
    const provider: jest.Mocked<DocumentSigningProvider> = {
      sign: jest.fn().mockResolvedValue({
        signedDocument,
        sha256SignedDocument: 'signed-sha256',
        signatureFormat: 'PKCS7_DETACHED',
        certificate: {
          subject: 'CN=Signer',
          issuer: 'CN=Issuer',
          serialNumber: '01',
          fingerprint: 'fingerprint',
          validFrom: '2026-01-01T00:00:00.000Z',
          validTo: '2027-01-01T00:00:00.000Z',
        },
        riwayatMetadata: metadata,
      }),
      verify: jest.fn(),
    };
    const repository = {
      findRiwayatForPdfSigning: jest.fn().mockResolvedValue({
        dokumenTte: { jenisDokumen: JenisDokumenTte.SOP_BERLAKU },
        user: { nama: 'Kepala OPD' },
      }),
      updateRiwayatPdfSignatureMetadata: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TtePdfSigningService,
        { provide: TteRepository, useValue: repository },
        { provide: DOCUMENT_SIGNING_PROVIDER, useValue: provider },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue) },
        },
      ],
    }).compile();
    const service = module.get(TtePdfSigningService);
    const pdfBase64 = Buffer.from('%PDF-1.4\nunsigned').toString('base64');

    const result = await service.signPdf(
      {
        sub: 'user-1',
        email: 'kepala@example.test',
        peran: PeranPengguna.KEPALA_OPD,
        opdId: 'opd-1',
      },
      {
        userId: 'user-1',
        dokumenTteId: 'dokumen-1',
        jenisDokumen: JenisDokumenTte.SOP_BERLAKU,
        pin: '123456',
        pdfBase64,
      },
    );

    expect(provider.sign).toHaveBeenCalledWith({
      document: Buffer.from(pdfBase64, 'base64'),
      signer: { userId: 'user-1', name: 'Kepala OPD' },
      authorization: { pin: '123456' },
      context: {
        dokumenTteId: 'dokumen-1',
        jenisDokumen: JenisDokumenTte.SOP_BERLAKU,
      },
    });
    expect(repository.updateRiwayatPdfSignatureMetadata).toHaveBeenCalledWith({
      userId: 'user-1',
      dokumenTteId: 'dokumen-1',
      metadata,
    });
    expect(result).toEqual(
      expect.objectContaining({
        signed: true,
        signedPdfBase64: signedDocument.toString('base64'),
        sha256SignedPdf: 'signed-sha256',
        signatureFormat: 'PKCS7_DETACHED',
      }),
    );
  });
});

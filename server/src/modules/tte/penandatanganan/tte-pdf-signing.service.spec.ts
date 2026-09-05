import { execSync } from 'child_process';

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JenisDokumenTte, PeranPengguna } from '../../../generated/prisma';
import { verifyPdfWithP12 } from '../shared/utils/pdf-signature-verification.util';
import { TtePdfSigningService } from './tte-pdf-signing.service';
import { TteRepository } from '../shared/repository/tte.repository';
import { encryptP12Passphrase } from '../shared/utils/tte-crypto.util';
import { DOCUMENT_SIGNING_PROVIDER } from './signing/document-signing.provider';
import { InternalP12SigningProvider } from './signing/internal-p12-signing.provider';

type PdfKitDocument = {
  on(event: string, listener: (...args: unknown[]) => void): void;
  text(value: string): void;
  end(): void;
};

type PdfKitDocumentConstructor = new () => PdfKitDocument;

type RepositoryMock = {
  findRiwayatForPdfSigning: jest.MockedFunction<TteRepository['findRiwayatForPdfSigning']>;
  updateRiwayatPdfSignatureMetadata: jest.MockedFunction<
    TteRepository['updateRiwayatPdfSignatureMetadata']
  >;
  findKredensial: jest.MockedFunction<TteRepository['findKredensial']>;
};

// pdfkit tersedia transitif melalui placeholder-plain dan hanya dipakai untuk fixture test.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require(
  require.resolve('pdfkit', { paths: [require.resolve('@signpdf/placeholder-plain')] }),
) as unknown as PdfKitDocumentConstructor;

describe('Pengujian TtePdfSigningService', () => {
  let service: TtePdfSigningService;
  let repository: RepositoryMock;
  let p12Base64 = '';
  const passphrase = 'test-passphrase';

  beforeAll(() => {
    const output = execSync(`node scripts/generate-pdf-signing-cert.cjs ${passphrase}`, {
      encoding: 'utf8',
    });
    const line = output.split('\n').find((entry) => entry.startsWith('PDF_SIGNING_P12_BASE64='));
    if (!line) {
      throw new Error('Gagal menghasilkan sertifikat uji PDF.');
    }
    p12Base64 = line.split('=')[1];
  });

  beforeEach(async () => {
    repository = {
      findRiwayatForPdfSigning: jest.fn(),
      updateRiwayatPdfSignatureMetadata: jest.fn(),
      findKredensial: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TtePdfSigningService,
        InternalP12SigningProvider,
        {
          provide: DOCUMENT_SIGNING_PROVIDER,
          useExisting: InternalP12SigningProvider,
        },
        {
          provide: TteRepository,
          useValue: repository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const values: Record<string, unknown> = {
                PDF_SIGNING_ENABLED: true,
                PDF_SIGNING_REASON: 'Uji',
                PDF_SIGNING_LOCATION: 'Indonesia',
                PDF_SIGNING_CONTACT: '',
              };
              return values[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();
    service = module.get(TtePdfSigningService);
    repository.findKredensial.mockResolvedValue({
      hashPin: 'unused-by-pdf-provider',
      p12Base64,
      p12PassphraseEncrypted: encryptP12Passphrase(passphrase, '123456'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('seharusnya tidak menginjeksi CA ketika signPdf menerima jenis Berita Acara', async () => {
    const userId = '00000000-0000-4000-8000-0000000000aa';
    const dokumenTteId = '00000000-0000-4000-8000-0000000000bb';
    repository.findRiwayatForPdfSigning.mockResolvedValue({
      userId,
      dokumenTteId,
      peran: PeranPengguna.PJ_EVALUATOR,
      ditandatanganiPada: new Date('2026-05-01T00:00:00.000Z'),
      dokumenTte: {
        dokumenTteId,
        nomorDokumen: 'BA-NO-CA',
        judulDokumen: 'Berita Acara Tanpa CA',
        jenisDokumen: JenisDokumenTte.BERITA_ACARA_EVALUASI,
      },
      user: {
        penggunaId: userId,
        nama: 'PJ Evaluator',
        nip: '198001011234567890',
        jabatan: 'PJ Evaluator',
      },
    });
    const pdfBase64 = (await createSamplePdf()).toString('base64');
    const actual = await service.signPdf(
      { sub: userId, email: 'pj@example.test', peran: PeranPengguna.PJ_EVALUATOR },
      {
        pin: '123456',
        dokumenTteId,
        userId,
        jenisDokumen: JenisDokumenTte.BERITA_ACARA_EVALUASI,
        pdfBase64,
      },
    );

    expect(actual.signed).toBe(false);
    expect(actual.signatureFormat).toBe('UNSIGNED_NOT_REQUIRED');
    expect(actual.certificate).toBeNull();
    expect(actual.signedPdfBase64).toBe(pdfBase64);
    expect(repository.updateRiwayatPdfSignatureMetadata).not.toHaveBeenCalled();
  });

  it('seharusnya menyimpan metadata sertifikat real dan binding TTE pada PDF SOP', async () => {
    const userId = '00000000-0000-4000-8000-0000000000aa';
    const dokumenTteId = '00000000-0000-4000-8000-0000000000bb';
    repository.findRiwayatForPdfSigning.mockResolvedValue({
      userId,
      dokumenTteId,
      peran: PeranPengguna.PJ_EVALUATOR,
      ditandatanganiPada: new Date('2026-05-01T00:00:00.000Z'),
      dokumenTte: {
        dokumenTteId,
        nomorDokumen: 'SOP-REAL-CERT',
        judulDokumen: 'SOP Real Cert',
        jenisDokumen: JenisDokumenTte.SOP_BERLAKU,
      },
      user: {
        penggunaId: userId,
        nama: 'PJ Evaluator',
        nip: '198001011234567890',
        jabatan: 'PJ Evaluator',
      },
    });
    const pdfBase64 = (await createSamplePdf()).toString('base64');
    const actual = await service.signPdf(
      { sub: userId, email: 'pj@example.test', peran: PeranPengguna.PJ_EVALUATOR },
      {
        pin: '123456',
        dokumenTteId,
        userId,
        jenisDokumen: JenisDokumenTte.SOP_BERLAKU,
        pdfBase64,
      },
    );
    expect(actual.signed).toBe(true);
    const persisted = repository.updateRiwayatPdfSignatureMetadata.mock.calls[0]?.[0];
    expect(persisted?.userId).toBe(userId);
    expect(persisted?.dokumenTteId).toBe(dokumenTteId);
    expect(persisted?.metadata.signatureAlgorithm).toBe('SHA256withRSA');
    expect(persisted?.metadata.signatureFormat).toBe('PKCS7_DETACHED');
    expect(persisted?.metadata.certFingerprint).toBe(actual.certificate?.fingerprint);
    expect(persisted?.metadata.certSerialNumber).toBe(actual.certificate?.serialNumber);

    const verification = verifyPdfWithP12(
      Buffer.from(actual.signedPdfBase64, 'base64'),
      Buffer.from(p12Base64, 'base64'),
      passphrase,
    );
    expect(verification.signatures[0]?.binding).toEqual({
      dokumenTteId,
      userId,
      jenisDokumen: JenisDokumenTte.SOP_BERLAKU,
    });
    expect(verification.signatures[0]?.signedAt).not.toBeNull();
  });
});

function createSamplePdf(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: unknown) => {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk);
    });
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.text('Dokumen uji Berita Acara arsip');
    doc.end();
  });
}

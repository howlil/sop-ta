import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join, normalize, relative, sep } from 'path';

const UUID_PART = '[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}';
const ATTEMPT_FILE = new RegExp(
  '^v\\d+-' + UUID_PART + '-' + UUID_PART + '\\.pdf(?:\\.tmp-\\d+-\\d+)?' + String.fromCharCode(36),
  'i',
);
const SAFE_DIRECTORY = /^[a-zA-Z0-9_-]+$/;

export type StoredSopPdf = {
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly sizeBytes: number;
  readonly sha256: string;
};

@Injectable()
export class SopPdfStorageService {
  private readonly rootDir: string;

  constructor(configService: ConfigService) {
    this.rootDir = normalize(
      configService.get<string>('SOP_PDF_STORAGE_DIR') ?? join(process.cwd(), 'src', 'sop'),
    );
  }

  buildRelativePath(params: {
    opdId: string;
    sopId: string;
    detailSopId: string;
    versi: number;
    /** Each signing attempt gets a distinct immutable artifact path. */
    attemptId?: string;
  }): string {
    return [
      this.segment(params.opdId),
      this.segment(params.sopId),
      `v${params.versi}-${this.segment(params.detailSopId)}${params.attemptId ? `-${this.segment(params.attemptId)}` : ''}.pdf`,
    ].join('/');
  }

  async writeOfficialPdf(relativePath: string, buffer: Buffer): Promise<StoredSopPdf> {
    const absolutePath = this.resolveInsideRoot(relativePath);
    const tmpPath = `${absolutePath}.tmp-${process.pid}-${Date.now()}`;
    await fs.mkdir(join(absolutePath, '..'), { recursive: true });
    try {
      await fs.writeFile(tmpPath, buffer);
      await fs.rename(tmpPath, absolutePath);
      return {
        relativePath,
        absolutePath,
        sizeBytes: buffer.byteLength,
        sha256: createHash('sha256').update(buffer).digest('hex'),
      };
    } catch (error) {
      await fs.rm(tmpPath, { force: true }).catch(() => undefined);
      throw new InternalServerErrorException(
        error instanceof Error
          ? `Gagal menyimpan PDF SOP: ${error.message}`
          : 'Gagal menyimpan PDF SOP',
      );
    }
  }

  async readPublishedPdf(relativePath: string): Promise<{ buffer: Buffer; sizeBytes: number }> {
    const absolutePath = this.resolveInsideRoot(relativePath);
    const buffer = await fs.readFile(absolutePath);
    return { buffer, sizeBytes: buffer.byteLength };
  }

  async deleteStoredPdf(relativePath: string): Promise<void> {
    await fs.rm(this.resolveInsideRoot(relativePath), { force: true }).catch(() => undefined);
  }

  /** Scan only OPD/SOP directories and UUID-labelled attempt files, not legacy PDFs. */
  async listStaleAttemptFiles(cutoff: Date, limit = 100): Promise<string[]> {
    const candidates: string[] = [];
    const read = async (path: string) => {
      try {
        return await fs.readdir(path, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw error;
      }
    };
    for (const opd of await read(this.rootDir)) {
      if (!opd.isDirectory() || !SAFE_DIRECTORY.test(opd.name)) continue;
      for (const sop of await read(join(this.rootDir, opd.name))) {
        if (!sop.isDirectory() || !SAFE_DIRECTORY.test(sop.name)) continue;
        for (const file of await read(join(this.rootDir, opd.name, sop.name))) {
          if (!file.isFile() || !ATTEMPT_FILE.test(file.name)) continue;
          const candidate = [opd.name, sop.name, file.name].join('/');
          const metadata = await fs.lstat(this.resolveInsideRoot(candidate));
          if (!metadata.isFile() || metadata.mtimeMs >= cutoff.getTime()) continue;
          candidates.push(candidate);
          if (candidates.length >= limit) return candidates;
        }
      }
    }
    return candidates;
  }

  /** Recheck type and age immediately before deletion. */
  async deleteStaleAttemptFile(relativePath: string, cutoff: Date): Promise<boolean> {
    const parts = relativePath.split('/');
    if (
      parts.length !== 3 ||
      !parts.slice(0, 2).every((part) => SAFE_DIRECTORY.test(part)) ||
      !ATTEMPT_FILE.test(parts[2] ?? '')
    ) {
      return false;
    }
    try {
      const absolutePath = this.resolveInsideRoot(relativePath);
      const metadata = await fs.lstat(absolutePath);
      if (!metadata.isFile() || metadata.mtimeMs >= cutoff.getTime()) return false;
      await fs.unlink(absolutePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  private resolveInsideRoot(relativePath: string): string {
    const absolutePath = normalize(join(this.rootDir, relativePath));
    const rel = relative(this.rootDir, absolutePath);
    if (rel.startsWith('..') || rel === '..' || rel.includes(`..${sep}`)) {
      throw new InternalServerErrorException('Path PDF SOP tidak valid');
    }
    return absolutePath;
  }

  private segment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '-');
  }
}

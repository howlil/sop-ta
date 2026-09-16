import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { StatusPengajuanEvaluasi, StatusSOP } from '../../generated/prisma';

export type WorkItemSopRow = Readonly<{
  detailSopId: string;
  nomorSOP: string;
  status: StatusSOP;
  updatedAt: Date;
  sop: Readonly<{
    judul: string;
    opdId: string;
  }>;
}>;

export type WorkItemPengajuanRow = Readonly<{
  pengajuanEvaluasiId: string;
  opdId: string;
  nomorBA: string | null;
  status: StatusPengajuanEvaluasi;
  updatedAt: Date;
  opd: Readonly<{ nama: string }>;
  nilaiEvaluasi: ReadonlyArray<{
    detailSopId: string;
    detailSop: Readonly<{
      detailSopId: string;
      nomorSOP: string;
      status: StatusSOP;
      updatedAt: Date;
      sop: Readonly<{ judul: string }>;
    }>;
  }>;
}>;

@Injectable()
export class WorkItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserOpdId(penggunaId: string): Promise<string | null> {
    const row = await this.prisma.pengguna.findUnique({
      where: { penggunaId },
      select: { opdId: true, deletedAt: true },
    });
    return row !== null && row.deletedAt === null ? row.opdId : null;
  }

  async findSopCandidates(
    opdId: string,
    statuses: readonly StatusSOP[],
  ): Promise<WorkItemSopRow[]> {
    return this.prisma.detailSOP.findMany({
      where: {
        status: { in: [...statuses] },
        sop: { opdId },
      },
      select: {
        detailSopId: true,
        nomorSOP: true,
        status: true,
        updatedAt: true,
        sop: { select: { judul: true, opdId: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { detailSopId: 'asc' }],
    });
  }

  async findPengajuanCandidates(
    statuses: readonly StatusPengajuanEvaluasi[],
    opdId?: string,
  ): Promise<WorkItemPengajuanRow[]> {
    return this.prisma.pengajuanEvaluasi.findMany({
      where: {
        status: { in: [...statuses] },
        ...(opdId !== undefined ? { opdId } : {}),
      },
      select: {
        pengajuanEvaluasiId: true,
        opdId: true,
        nomorBA: true,
        status: true,
        updatedAt: true,
        opd: { select: { nama: true } },
        nilaiEvaluasi: {
          select: {
            detailSopId: true,
            detailSop: {
              select: {
                detailSopId: true,
                nomorSOP: true,
                status: true,
                updatedAt: true,
                sop: { select: { judul: true } },
              },
            },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { pengajuanEvaluasiId: 'asc' }],
    });
  }
}

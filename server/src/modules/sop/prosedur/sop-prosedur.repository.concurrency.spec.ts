import { SopEditConflictError } from '../shared/sop-edit-conflict.error';
import { SopProsedurRepository } from './sop-prosedur.repository';

describe('SopProsedurRepository optimistic concurrency', () => {
  it('menolak stale revision sebelum replace-all menyentuh data prosedur', async () => {
    const tx = {
      detailSOP: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      detailSOPPelaksana: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      langkahSOP: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const repository = new SopProsedurRepository(prisma as never);

    await expect(
      repository.updateProsedurTransaction({
        detailSopId: 'detail-1',
        userId: 'user-1',
        expectedRevision: 7,
        input: { pelaksana: [] },
        changedFields: ['pelaksana'],
      }),
    ).rejects.toBeInstanceOf(SopEditConflictError);

    expect(tx.detailSOP.updateMany).toHaveBeenCalledWith({
      where: { detailSopId: 'detail-1', prosedurRevision: 7 },
      data: {
        prosedurRevision: { increment: 1 },
        terakhirDieditOlehId: 'user-1',
      },
    });
    expect(tx.detailSOPPelaksana.deleteMany).not.toHaveBeenCalled();
    expect(tx.langkahSOP.deleteMany).not.toHaveBeenCalled();
  });
});

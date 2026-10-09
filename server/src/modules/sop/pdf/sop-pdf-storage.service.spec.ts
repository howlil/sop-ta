import { ConfigService } from '@nestjs/config';
import { SopPdfStorageService } from './sop-pdf-storage.service';

describe('SOP PDF storage attempt identity', () => {
  const storage = new SopPdfStorageService({
    get: jest.fn().mockReturnValue('/tmp/sop-ta-pdf-tests'),
  } as unknown as ConfigService);

  it('uses distinct paths for concurrent signing attempts of the same SOP version', () => {
    const props = { opdId: 'opd-1', sopId: 'sop-1', detailSopId: 'detail-1', versi: 2 };
    const first = storage.buildRelativePath({ ...props, attemptId: 'attempt-1' });
    const second = storage.buildRelativePath({ ...props, attemptId: 'attempt-2' });
    expect(first).not.toBe(second);
    expect(first).toContain('attempt-1');
    expect(second).toContain('attempt-2');
    expect(first).toMatch(/\.pdf$/);
  });
});

export type SopEditConflictSection = 'PROSEDUR' | 'DIAGRAM';

export class SopEditConflictError extends Error {
  constructor(readonly section: SopEditConflictSection) {
    super(`SOP edit conflict: ${section}`);
    this.name = 'SopEditConflictError';
  }
}

export const SOP_EDIT_CONFLICT_CODE = 'SOP_EDIT_CONFLICT';

export function sopEditConflictResponse(section: SopEditConflictSection) {
  return {
    statusCode: 409,
    code: SOP_EDIT_CONFLICT_CODE,
    section,
    message:
      'SOP telah berubah sejak versi ini dibuka. Draft lokal tidak ditimpa; ambil versi terbaru sebelum menyimpan lagi.',
  } as const;
}

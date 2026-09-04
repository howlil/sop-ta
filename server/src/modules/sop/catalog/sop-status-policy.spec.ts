import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PeranPengguna, StatusSOP } from '../../../generated/prisma';
import {
  assertAllowedSopStatusTransition,
  assertSopWorkflowActionAllowed,
  getSopWorkflowProjection,
} from './sop-status-policy';

describe('Pengujian kebijakan status SOP', () => {
  it('seharusnya melempar ConflictException ketika target sama dengan status saat ini', () => {
    expect(() =>
      assertAllowedSopStatusTransition({
        role: PeranPengguna.PENYUSUN,
        current: StatusSOP.DRAFT,
        target: StatusSOP.DRAFT,
      }),
    ).toThrow(ConflictException);
  });

  it('seharusnya mengizinkan penyusun draft menjadi menunggu pengajuan evaluasi', () => {
    expect(() =>
      assertAllowedSopStatusTransition({
        role: PeranPengguna.PENYUSUN,
        current: StatusSOP.DRAFT,
        target: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      }),
    ).not.toThrow();
  });

  it('seharusnya menolak akses evaluator saat menandai menunggu pengajuan evaluasi', () => {
    expect(() =>
      assertAllowedSopStatusTransition({
        role: PeranPengguna.EVALUATOR,
        current: StatusSOP.DRAFT,
        target: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      }),
    ).toThrow(ForbiddenException);
  });

  it('seharusnya mengizinkan PJ penyusun siap menjadi diajukan evaluasi', () => {
    expect(() =>
      assertAllowedSopStatusTransition({
        role: PeranPengguna.PJ_PENYUSUN,
        current: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
        target: StatusSOP.DIAJUKAN_EVALUASI,
      }),
    ).not.toThrow();
  });

  it('seharusnya menolak status berlaku melalui endpoint umum', () => {
    expect(() =>
      assertAllowedSopStatusTransition({
        role: PeranPengguna.KEPALA_OPD,
        current: StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
        target: StatusSOP.BERLAKU,
      }),
    ).toThrow(ConflictException);
  });

  it('seharusnya mengizinkan kepala OPD cabut berlaku', () => {
    expect(() =>
      assertAllowedSopStatusTransition({
        role: PeranPengguna.KEPALA_OPD,
        current: StatusSOP.BERLAKU,
        target: StatusSOP.DICABUT,
      }),
    ).not.toThrow();
  });

  it('memproyeksikan action authoring untuk penyusun', () => {
    expect(getSopWorkflowProjection(PeranPengguna.PENYUSUN, StatusSOP.DRAFT)).toEqual({
      stage: 'AUTHORING',
      stateLabel: 'Draft',
      allowedActions: ['VIEW_HISTORY', 'EDIT', 'SUBMIT_FOR_REVIEW'],
    });
  });

  it('tidak memberi action edit kepada evaluator walaupun status masih draft', () => {
    expect(
      getSopWorkflowProjection(PeranPengguna.EVALUATOR, StatusSOP.DRAFT).allowedActions,
    ).not.toContain('EDIT');
  });

  it('memproyeksikan submit evaluation hanya untuk PJ Penyusun', () => {
    expect(
      getSopWorkflowProjection(
        PeranPengguna.PJ_PENYUSUN,
        StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      ).allowedActions,
    ).toContain('SUBMIT_EVALUATION');
    expect(
      getSopWorkflowProjection(
        PeranPengguna.PENYUSUN,
        StatusSOP.MENUNGGU_PENGAJUAN_EVALUASI,
      ).allowedActions,
    ).not.toContain('SUBMIT_EVALUATION');
  });

  it('memproyeksikan sign hanya untuk Kepala OPD pada final approval', () => {
    const kepala = getSopWorkflowProjection(
      PeranPengguna.KEPALA_OPD,
      StatusSOP.DIVERIFIKASI_PJ_EVALUATOR_ORGANISASI,
    );
    expect(kepala.stage).toBe('FINAL_APPROVAL');
    expect(kepala.allowedActions).toContain('SIGN');
    expect(
      getSopWorkflowProjection(
        PeranPengguna.PJ_PENYUSUN,
        StatusSOP.DIVERIFIKASI_PJ_EVALUATOR_ORGANISASI,
      ).allowedActions,
    ).not.toContain('SIGN');
  });

  it('memproyeksikan revoke hanya untuk Kepala OPD pada SOP berlaku', () => {
    expect(
      getSopWorkflowProjection(PeranPengguna.KEPALA_OPD, StatusSOP.BERLAKU).allowedActions,
    ).toContain('REVOKE');
    expect(
      getSopWorkflowProjection(PeranPengguna.PENYUSUN, StatusSOP.BERLAKU).allowedActions,
    ).not.toContain('REVOKE');
  });

  it('menggunakan policy yang sama untuk enforcement kirim ulang evaluasi', () => {
    expect(() =>
      assertSopWorkflowActionAllowed({
        role: PeranPengguna.PJ_PENYUSUN,
        status: StatusSOP.REVISI_DARI_EVALUATOR,
        action: 'RESUBMIT_EVALUATION',
      }),
    ).not.toThrow();
    expect(() =>
      assertSopWorkflowActionAllowed({
        role: PeranPengguna.PENYUSUN,
        status: StatusSOP.REVISI_DARI_EVALUATOR,
        action: 'RESUBMIT_EVALUATION',
      }),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertSopWorkflowActionAllowed({
        role: PeranPengguna.PJ_PENYUSUN,
        status: StatusSOP.SEDANG_DIEVALUASI,
        action: 'RESUBMIT_EVALUATION',
      }),
    ).toThrow(ConflictException);
  });

  it('menggunakan policy yang sama untuk enforcement pencabutan', () => {
    expect(() =>
      assertSopWorkflowActionAllowed({
        role: PeranPengguna.KEPALA_OPD,
        status: StatusSOP.BERLAKU,
        action: 'REVOKE',
      }),
    ).not.toThrow();
    expect(() =>
      assertSopWorkflowActionAllowed({
        role: PeranPengguna.PENYUSUN,
        status: StatusSOP.BERLAKU,
        action: 'REVOKE',
      }),
    ).toThrow(ForbiddenException);
  });
});

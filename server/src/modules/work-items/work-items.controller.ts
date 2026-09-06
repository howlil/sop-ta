import { Controller, Get, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  type ApiSuccessResponse,
  type JwtAccessPayload,
  Roles,
  UseJwtAndRolesGuards,
} from '../../common';
import { PeranPengguna } from '../../generated/prisma';
import { ACCESS_TOKEN_COOKIE_NAME } from '../core/auth/helpers/auth.shared';
import type { WorkItemsResponse } from './work-item.types';
import { WorkItemsService } from './work-items.service';

const ALL_AUTHENTICATED_ROLES = [
  PeranPengguna.PJ_EVALUATOR,
  PeranPengguna.EVALUATOR,
  PeranPengguna.PENYUSUN,
  PeranPengguna.PJ_PENYUSUN,
  PeranPengguna.KEPALA_OPD,
] as const;

@ApiTags('Work Items')
@Controller('work-items')
@UseJwtAndRolesGuards()
export class WorkItemsController {
  constructor(private readonly service: WorkItemsService) {}

  @Get()
  @Roles(...ALL_AUTHENTICATED_ROLES)
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE_NAME)
  @ApiOperation({ summary: 'Pekerjaan workflow yang membutuhkan tindakan pengguna saat ini' })
  @ApiResponse({ status: 200 })
  async findMine(
    @Req() req: Request & { user: JwtAccessPayload },
  ): Promise<ApiSuccessResponse<WorkItemsResponse>> {
    return {
      success: true,
      message: 'Pekerjaan saat ini berhasil diambil',
      data: await this.service.findMine(req.user),
    };
  }
}
